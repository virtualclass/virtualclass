// This file is part of Vidyamantra - http:www.vidyamantra.com/
/**
 * By this file we are creating the Editor
 * It depends on parameters what kind of editor(Rich Text or Code editor would be created)
 *
 * @Copyright 2015  Vidyamantra Edusystems. Pvt.Ltd.
 * @author  Suman Bogati <http://www.vidyamantra.com>
 *
 *
 */
(function (window) {
  const RichTextCodeMirrorAdapter = (function () {
    // var TextOperation = vceditor.TextOperation;
    // var WrappedOperation = vceditor.WrappedOperation;
    // var Cursor = vceditor.Cursor;

    const { TextOperation } = window;
    const { WrappedOperation } = window;
    const { Cursor } = window;


    function RichTextCodeMirrorAdapter(rtcm) {
      this.rtcm = rtcm;
      this.cm = rtcm.codeMirror;

      bind(this, 'onChange');
      bind(this, 'onAttributesChange');
      bind(this, 'onCursorActivity');
      bind(this, 'onFocus');
      bind(this, 'onBlur');

      this.rtcm.on('change', this.onChange);
      this.rtcm.on('attributesChange', this.onAttributesChange);
      this.cm.on('cursorActivity', this.onCursorActivity);
      this.cm.on('focus', this.onFocus);
      this.cm.on('blur', this.onBlur);
    }

    // Removes all event listeners from the CodeMirror instance.
    RichTextCodeMirrorAdapter.prototype.detach = function () {
      this.rtcm.off('change', this.onChange);
      this.rtcm.off('attributesChange', this.onAttributesChange);

      this.cm.off('cursorActivity', this.onCursorActivity);
      this.cm.off('focus', this.onFocus);
      this.cm.off('blur', this.onBlur);
    };

    function cmpPos(a, b) {
      if (a.line < b.line) {
        return -1;
      }
      if (a.line > b.line) {
        return 1;
      }
      if (a.ch < b.ch) {
        return -1;
      }
      if (a.ch > b.ch) {
        return 1;
      }
      return 0;
    }

    function posEq(a, b) {
      return cmpPos(a, b) === 0;
    }

    function posLe(a, b) {
      return cmpPos(a, b) <= 0;
    }

    function codemirrorLength(cm) {
      const lastLine = cm.lineCount() - 1;
      return cm.indexFromPos({ line: lastLine, ch: cm.getLine(lastLine).length });
    }

    // Converts a CodeMirror change object into a TextOperation and its inverse
    // and returns them as a two-element array.
    RichTextCodeMirrorAdapter.operationFromCodeMirrorChanges = function (changes, cm) {
      // Approach: Replay the changes, beginning with the most recent one, and
      // construct the operation and its inverse. We have to convert the position
      // in the pre-change coordinate system to an index. We have a method to
      // convert a position in the coordinate system after all changes to an index,
      // namely CodeMirror's `indexFromPos` method. We can use the information of
      // a single change object to convert a post-change coordinate system to a
      // pre-change coordinate system. We can now proceed inductively to get a
      // pre-change coordinate system for all changes in the linked list.
      // A disadvantage of this approach is its complexity `O(n^2)` in the length
      // of the linked list of changes.

      let docEndLength = codemirrorLength(cm);
      let operation = new TextOperation().retain(docEndLength);
      let inverse = new TextOperation().retain(docEndLength);

      for (let i = changes.length - 1; i >= 0; i--) {
        const change = changes[i];
        const fromIndex = change.start;
        const restLength = docEndLength - fromIndex - change.text.length;

        operation = new TextOperation()
          .retain(fromIndex)
          .delete(change.removed.length)
          .insert(change.text, change.attributes)
          .retain(restLength)
          .compose(operation);

        inverse = inverse.compose(new TextOperation()
          .retain(fromIndex)
          .delete(change.text.length)
          .insert(change.removed, change.removedAttributes)
          .retain(restLength));

        docEndLength += change.removed.length - change.text.length;
      }

      return [operation, inverse];
    };

    // Converts an attributes changed object to an operation and its inverse.
    RichTextCodeMirrorAdapter.operationFromAttributesChanges = function (changes, cm) {
      const docEndLength = codemirrorLength(cm);

      const operation = new TextOperation(); const
        inverse = new TextOperation();
      let pos = 0;

      for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        const toRetain = change.start - pos;
        assert(toRetain >= 0); // changes should be in order and non-overlapping.
        operation.retain(toRetain);
        inverse.retain(toRetain);

        const length = change.end - change.start;
        operation.retain(length, change.attributes);
        inverse.retain(length, change.attributesInverse);
        pos = change.start + length;
      }

      operation.retain(docEndLength - pos);
      inverse.retain(docEndLength - pos);

      return [operation, inverse];
    };

    // Apply an operation to a CodeMirror instance.
    RichTextCodeMirrorAdapter.applyOperationToCodeMirror = function (operation, rtcm) {
      // HACK: If there are a lot of operations; hide CodeMirror so that it doesn't re-render constantly.
      if (operation.ops.length > 10) rtcm.codeMirror.getWrapperElement().setAttribute('style', 'display: none');

      const { ops } = operation;
      let index = 0; // holds the current index into CodeMirror's content
      for (let i = 0, l = ops.length; i < l; i++) {
        var op = ops[i];
        if (op.isRetain()) {
          if (!emptyAttributes(op.attributes)) {
            rtcm.updateTextAttributes(index, index + op.chars, (attributes) => {
              for (const attr in op.attributes) {
                if (op.attributes[attr] === false) {
                  delete attributes[attr];
                } else {
                  attributes[attr] = op.attributes[attr];
                }
              }
            }, 'RTCMADAPTER', /* doLineAttributes= */true);
          }
          index += op.chars;
        } else if (op.isInsert()) {
          rtcm.insertText(index, op.text, op.attributes, 'RTCMADAPTER');
          index += op.text.length;
        } else if (op.isDelete()) {
          rtcm.removeText(index, index + op.chars, 'RTCMADAPTER');
        }
      }

      if (operation.ops.length > 10) {
        rtcm.codeMirror.getWrapperElement().setAttribute('style', '');
        rtcm.codeMirror.refresh();
      }
    };

    RichTextCodeMirrorAdapter.prototype.registerCallbacks = function (cb) {
      this.callbacks = cb;
    };

    RichTextCodeMirrorAdapter.prototype.onChange = function (_, changes) {
      if (changes[0].origin !== 'RTCMADAPTER') {
        const pair = RichTextCodeMirrorAdapter.operationFromCodeMirrorChanges(changes, this.cm);
        this.trigger('change', pair[0], pair[1]);
      }
    };

    RichTextCodeMirrorAdapter.prototype.onAttributesChange = function (_, changes) {
      if (changes[0].origin !== 'RTCMADAPTER') {
        const pair = RichTextCodeMirrorAdapter.operationFromAttributesChanges(changes, this.cm);
        this.trigger('change', pair[0], pair[1]);
      }
    };

    RichTextCodeMirrorAdapter.prototype.onCursorActivity = function () {
      this.trigger('cursorActivity');
    };

    RichTextCodeMirrorAdapter.prototype.onFocus = function () {
      this.trigger('focus');
    };

    RichTextCodeMirrorAdapter.prototype.onBlur = function () {
      if (!this.cm.somethingSelected()) {
        this.trigger('blur');
      }
    };

    RichTextCodeMirrorAdapter.prototype.getValue = function () {
      return this.cm.getValue();
    };

    RichTextCodeMirrorAdapter.prototype.getCursor = function () {
      const { cm } = this;
      const cursorPos = cm.getCursor();
      const position = cm.indexFromPos(cursorPos);
      let selectionEnd;
      if (cm.somethingSelected()) {
        const startPos = cm.getCursor(true);
        const selectionEndPos = posEq(cursorPos, startPos) ? cm.getCursor(false) : startPos;
        selectionEnd = cm.indexFromPos(selectionEndPos);
      } else {
        selectionEnd = position;
      }

      return new Cursor(position, selectionEnd);
    };

    RichTextCodeMirrorAdapter.prototype.setCursor = function (cursor) {
      this.cm.setSelection(
        this.cm.posFromIndex(cursor.position),
        this.cm.posFromIndex(cursor.selectionEnd),
      );
    };

    RichTextCodeMirrorAdapter.prototype.addStyleRule = function (css) {
      if (typeof document === 'undefined' || document === null) {
        return;
      }
      if (!this.addedStyleRules) {
        this.addedStyleRules = {};
        const styleElement = document.createElement('style');
        document.documentElement.getElementsByTagName('head')[0].appendChild(styleElement);
        this.addedStyleSheet = styleElement.sheet;
      }
      if (this.addedStyleRules[css]) {
        return;
      }
      this.addedStyleRules[css] = true;
      return this.addedStyleSheet.insertRule(css, 0);
    };

    RichTextCodeMirrorAdapter.prototype.setOtherCursor = function (cursor, color, clientId) {
      const cursorPos = this.cm.posFromIndex(cursor.position);
      if (typeof color !== 'string' || !color.match(/^#[a-fA-F0-9]{3,6}$/)) {
        return;
      }
      const end = this.rtcm.end();
      if (typeof cursor !== 'object' || typeof cursor.position !== 'number' || typeof cursor.selectionEnd !== 'number') {
        return;
      }
      if (cursor.position < 0 || cursor.position > end || cursor.selectionEnd < 0 || cursor.selectionEnd > end) {
        return;
      }

      // changed by SUMAN

      const cursorCoords = this.cm.cursorCoords(cursorPos);

      const cursorEl = document.createElement('span');
      // console.log('Coords ' + cursorCoords);
      cursorEl.className = 'other-client';
      cursorEl.id = `cursorId${clientId}`;
      cursorEl.style.borderLeftWidth = '3px';
      cursorEl.style.borderLeftStyle = 'solid';
      cursorEl.style.borderLeftColor = color;
      cursorEl.style.marginLeft = cursorEl.style.marginRight = '-3px';
      cursorEl.style.height = `${(cursorCoords.bottom - cursorCoords.top) * 0.9}px`;
      cursorEl.setAttribute('data-clientname', virtualclass.vutil.getUserInfo('name', clientId, virtualclass.connectedUsers)); // display user name with cursor
      cursorEl.setAttribute('data-clientid', clientId);
      cursorEl.style.position = 'relative';

      const cursorTag = document.getElementById(`cursorId${clientId}`);
      if (cursorTag != null) {
        cursorTag.parentNode.removeChild(cursorTag);
      }

      if (clientId != virtualclass.gObj.uid) {
        if (cursor.position === cursor.selectionEnd) {
          cursorEl.style.zIndex = 0;
          return this.cm.setBookmark(cursorPos, { widget: cursorEl, insertLeft: true });
        }

        this.cm.setBookmark(cursorPos, { widget: cursorEl, insertLeft: true });

        // show selection
        const selectionClassName = `selection-${color.replace('#', '')}`;
        const rule = `.${selectionClassName} { background: ${color}; }`;
        this.addStyleRule(rule);

        let fromPos; let
          toPos;
        if (cursor.selectionEnd > cursor.position) {
          fromPos = cursorPos;
          toPos = this.cm.posFromIndex(cursor.selectionEnd);
        } else {
          fromPos = this.cm.posFromIndex(cursor.selectionEnd);
          toPos = cursorPos;
        }
        return this.cm.markText(fromPos, toPos, {
          className: selectionClassName,
        });
      }
    };

    RichTextCodeMirrorAdapter.prototype.trigger = function (event) {
      const args = Array.prototype.slice.call(arguments, 1);
      const action = this.callbacks && this.callbacks[event];
      if (action) {
        action.apply(this, args);
      }
    };

    RichTextCodeMirrorAdapter.prototype.applyOperation = function (operation) {
      RichTextCodeMirrorAdapter.applyOperationToCodeMirror(operation, this.rtcm);
    };

    RichTextCodeMirrorAdapter.prototype.registerUndo = function (undoFn) {
      this.cm.undo = undoFn;
    };

    RichTextCodeMirrorAdapter.prototype.registerRedo = function (redoFn) {
      this.cm.redo = redoFn;
    };

    RichTextCodeMirrorAdapter.prototype.invertOperation = function (operation) {
      let pos = 0; const cm = this.rtcm.codeMirror; let spans; let
        i;
      const inverse = new TextOperation();
      for (let opIndex = 0; opIndex < operation.wrapped.ops.length; opIndex++) {
        const op = operation.wrapped.ops[opIndex];
        if (op.isRetain()) {
          if (emptyAttributes(op.attributes)) {
            inverse.retain(op.chars);
            pos += op.chars;
          } else {
            spans = this.rtcm.getAttributeSpans(pos, pos + op.chars);
            for (i = 0; i < spans.length; i++) {
              const inverseAttributes = {};
              for (const attr in op.attributes) {
                const opValue = op.attributes[attr];
                const curValue = spans[i].attributes[attr];

                if (opValue === false) {
                  if (curValue) {
                    inverseAttributes[attr] = curValue;
                  }
                } else if (opValue !== curValue) {
                  inverseAttributes[attr] = curValue || false;
                }
              }

              inverse.retain(spans[i].length, inverseAttributes);
              pos += spans[i].length;
            }
          }
        } else if (op.isInsert()) {
          inverse.delete(op.text.length);
        } else if (op.isDelete()) {
          const text = cm.getRange(cm.posFromIndex(pos), cm.posFromIndex(pos + op.chars));

          spans = this.rtcm.getAttributeSpans(pos, pos + op.chars);
          let delTextPos = 0;
          for (i = 0; i < spans.length; i++) {
            inverse.insert(text.substr(delTextPos, spans[i].length), spans[i].attributes);
            delTextPos += spans[i].length;
          }

          pos += op.chars;
        }
      }

      return new WrappedOperation(inverse, operation.meta.invert());
    };

    // Throws an error if the first argument is falsy. Useful for debugging.
    function assert(b, msg) {
      if (!b) {
        throw new Error(msg || 'assertion error');
      }
    }

    // Bind a method to an object, so it doesn't matter whether you call
    // object.method() directly or pass object.method as a reference to another
    // function.
    function bind(obj, method) {
      const fn = obj[method];
      obj[method] = function () {
        fn.apply(obj, arguments);
      };
    }

    function emptyAttributes(attrs) {
      for (const attr in attrs) {
        return false;
      }
      return true;
    }

    return RichTextCodeMirrorAdapter;
  }());
  window.Client = RichTextCodeMirrorAdapter;
}(window));
