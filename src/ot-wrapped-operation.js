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
  const WrappedOperation = (function (global) {
    // A WrappedOperation contains an operation and corresponing metadata.
    function WrappedOperation(operation, meta) {
      this.wrapped = operation;
      this.meta = meta;
    }

    WrappedOperation.prototype.apply = function () {
      return this.wrapped.apply.apply(this.wrapped, arguments);
    };

    WrappedOperation.prototype.invert = function () {
      const { meta } = this;
      return new WrappedOperation(
        this.wrapped.invert.apply(this.wrapped, arguments),
        meta && typeof meta === 'object' && typeof meta.invert === 'function'
          ? meta.invert.apply(meta, arguments) : meta,
      );
    };

    // Copy all properties from source to target.
    function copy(source, target) {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    function composeMeta(a, b) {
      if (a && typeof a === 'object') {
        if (typeof a.compose === 'function') {
          return a.compose(b);
        }
        const meta = {};
        copy(a, meta);
        copy(b, meta);
        return meta;
      }
      return b;
    }

    WrappedOperation.prototype.compose = function (other) {
      return new WrappedOperation(
        this.wrapped.compose(other.wrapped),
        composeMeta(this.meta, other.meta),
      );
    };

    function transformMeta(meta, operation) {
      if (meta && typeof meta === 'object') {
        if (typeof meta.transform === 'function') {
          return meta.transform(operation);
        }
      }
      return meta;
    }

    WrappedOperation.transform = function (a, b) {
      const { transform } = a.wrapped.constructor;
      const pair = transform(a.wrapped, b.wrapped);
      return [
        new WrappedOperation(pair[0], transformMeta(a.meta, b.wrapped)),
        new WrappedOperation(pair[1], transformMeta(b.meta, a.wrapped)),
      ];
    };

    return WrappedOperation;
  }());
  window.WrappedOperation = WrappedOperation;
}(window));
