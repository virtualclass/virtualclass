/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

(function (window) {
  const { io } = window;
  /*
   * It handles  message event fired on changing state of the slides
   * Message event  can be fired by  using postMessage or by changing
   * state of the slides.
   *and teacher  broadcasts the state to the students
   *@param  message event received
   */


  const sharePt = function () {
    let pptfirst = false;
    return {
      pptUrl: '',
      state: {},
      urlValue: '',
      localStoragFlag: false,
      eventsObj: [],
      autoSlideTime: 0,
      viewFlag: 0,
      controlFlag: 0,
      autoSlideFlag: 0,
      autoSlideResumed: 0,
      // studentPptReadyFlag: 0,
      studentPpt: 0,
      startFromFlag: 0,
      startFrom: 0,
      currId: '',
      order: [],

      /*
       * Initalizes and creates ppt layout at student's and teacheh's ends
       * @param app sharePresentation
       * @param cusEvent byclick event
       */
      init(app, cusEvent) {
        this.pages = {};
        this.order = [];
        this.autoSlideFlag = 0;
        this.autoSlideTime = 0;
        this.autoSlideResumed = 0;
        if (typeof virtualclass.previous !== 'undefined') {
          if (typeof cusEvent !== 'undefined' && cusEvent == 'byclick') {
            if (roles.hasControls()) {
              virtualclass.vutil.beforeSend({ ppt: true, init: 'makeAppReady', cf: 'ppt' });
            }
          }
        }

        const elem = document.getElementById('virtualclassSharePresentation');
        if (elem != null) {
          elem.parentNode.removeChild(elem);
        }

        this.UI.container();
        const messageContainer = document.getElementById('pptMessageLayout');

        if (roles.hasControls()) {
          const that = this;
          var urlCont = document.getElementById('urlcontainer');
          if (messageContainer != null) {
            messageContainer.style.display = 'none';
          }
          if (urlCont) {
            urlCont.style.display = 'block';
          }
          virtualclass.vutil.requestOrder('presentation', (response) => {
            console.log(response);
            if (virtualclass.vutil.isResponseAvailable(response)) {
              virtualclass.sharePt.order = response;
            } else {
              console.log('Order response is not available');
            }
          });
        } else if (roles.hasView()) {
          var urlCont = document.getElementById('urlcontainer');
          this.UI.messageDisplay();
          if (messageContainer) {
            messageContainer.style.display = 'block';
          }
          if (urlCont) {
            urlCont.style.display = 'none';
          }
        }
        this.findInStorage();
        if (roles.hasControls()) {
          if (!pptfirst) {
            this.getPptList();
            pptfirst = true;
          }
        }
        virtualclass.sharePt.attachMessageEvent('message', virtualclass.sharePt.pptMessageEventHandler);
      },

      createPageModule() {
        if (virtualclass.sharePt.ppts && virtualclass.sharePt.ppts.length) {
          virtualclass.sharePt.ppts.forEach((pptObj, i) => {
            const idPostfix = pptObj.fileuuid;
            // var docId = 'docs' + doc;
            virtualclass.sharePt.pages[idPostfix] = new virtualclass.page('pptListContainer', 'ppt', 'virtualclassSharePresentation', 'sharePt', pptObj.status);
          });
        }
      },

      /*
       *if there is refresh/reload find url and state from the localStorage and sets the control
       */
      findInStorage() {
        var pApp = localStorage.getItem('prevApp');
        console.log(`test pApp${typeof pApp}`);
        console.log(pApp);
        if (pApp != null) {
          var pApp = JSON.parse(pApp);
          if (pApp.name == 'SharePresentation') {
            // var url = localStorage.getItem('pptUrl');
            const mdata = pApp.metaData;
            if (mdata != null) {
              const url = mdata.init;
              if (url) {
                this.localStoragFlag = true;
                this.pptUrl = JSON.parse(localStorage.getItem('pptUrl'));

                // if (roles.hasControls()) {
                //                                    ioAdapter.mustSend({pptMsg: this.pptUrl, cf: 'ppt', uid: wbUser.id, flag: "url", onrefresh: true});
                //                                }

                if (mdata.startFrom != null) {
                  virtualclass.sharePt.stateLocalStorage = mdata.startFrom;
                }
                if (mdata.currId != null) {
                  virtualclass.sharePt.currId = mdata.currId;
                }
              }
            }
            // TODO this should be checked propery and should located inside nested function
            if (this.localStoragFlag) {
              this.fromLocalStorage(virtualclass.sharePt.state);
            }
          }
        }

        virtualclass.previrtualclass = `virtualclass${virtualclass.currApp}`;
      },
      /*
       * set state ,state retrieved from localStorage
       * @param  state ,saved state in local storage
       */

      fromLocalStorage(state) {
        if (document.getElementById('iframecontainer') == null) {
          this.UI.createIframe();
        }
        const iframeContainer = document.getElementById('iframecontainer');
        iframeContainer.style.display = 'block';
        const iframe = document.getElementById('pptiframe');
        const pptUrl = (this.pptUrl.search('postMessage') < 0) ? `${this.pptUrl}?postMessage=true&postMessageEvents=true` : this.pptUrl;
        iframe.setAttribute('src', pptUrl);

        this.setAutoSlideConfig();

        const msgCont = document.getElementById('pptMessageLayout');
        if (msgCont != null) {
          console.log('message block');
          msgCont.style.display = 'none';
        }
        const pptContainer = document.getElementById(this.UI.id);
        if (!pptContainer.classList.contains('pptSharing')) {
          pptContainer.classList.add('pptSharing');
        }
      },

      _rearrange(order) {
        this.order = order;
        this.reArrangeElements(order);
        // this.sendOrder(this.order);
        virtualclass.vutil.sendOrder('presentation', order);
      },

      // not needed
      sendOrder(order) {
        const data = {
          content_order: order.toString(),
          content_order_type: '3',
          live_class_id: virtualclass.gObj.congCourse,
        };
        virtualclass.vutil.xhrSendWithForm(data, 'congrea_page_order');
      },


      reArrangeElements(order) {
        const container = document.getElementById('listppt');
        const tmpdiv = document.createElement('div');
        tmpdiv.id = 'listppt';
        tmpdiv.className = 'ppts';
        let orderChange = false;

        for (let j = 0; j < virtualclass.sharePt.activeppts.length; j++) {
          if (order.indexOf(virtualclass.sharePt.activeppts[j].fileuuid) <= -1) {
            order.push(virtualclass.sharePt.activeppts[j].fileuuid);
            orderChange = true;
          }
        }

        for (let i = 0; i < order.length; i++) {
          const elem = document.getElementById(`linkppt${order[i]}`);
          if (elem) {
            tmpdiv.appendChild(elem);
          }
        }

        container.parentNode.replaceChild(tmpdiv, container);
        if (orderChange) {
          virtualclass.sharePt.order = order;
          virtualclass.vutil.sendOrder('presentation', virtualclass.sharePt.order);
          orderChange = false;
        }
      },


      _delete(id) {
        // var form_data = new FormData();
        // var data = {lc_content_id: id, action: 'delete', user: virtualclass.gObj.uid};
        // var form_data = new FormData();
        // for (var key in data) {
        //     form_data.append(key, data[key]);
        //     console.log(data[key]);
        // }

        const data = {
          uuid: id,
          action: 'delete',
          page: 0,
        };
        // var videoid = id;
        const url = virtualclass.api.UpdateDocumentStatus;
        const that = this;
        // virtualclass.xhrn.sendFormData({uuid:videoid}, url, function (msg) {
        //     that.afterDeleteCallback(msg)
        // });

        virtualclass.xhrn.vxhrn.post(url, data).then((msg) => {
          that.afterDeletePtCallback(msg.data, id);
        });


        // virtualclass.xhr.vxhr.postFormData(window.webapi + "&user=" + virtualclass.gObj.uid + "&methodname=update_content_video", formData).then((msg) => {
        //     if (msg != "ERROR") {
        //         var elem = document.getElementById("linkppt" + id);
        //         if (elem) {
        //             elem.parentNode.removeChild(elem);
        //             //virtualclass.videoUl.order=[];
        //             if(virtualclass.sharePt.ppts.length) {
        //                 virtualclass.sharePt.ppts.forEach(function (ppt, index) {
        //                     if (ppt["id"] == id) {
        //                         var index = virtualclass.sharePt.ppts.indexOf(ppt)
        //                         if (index >= 0) {
        //                             virtualclass.sharePt.ppts.splice(index, 1)
        //                             console.log(virtualclass.sharePt.ppts);
        //                         }
        //                     }
        //                 })
        //
        //                 var idIndex = virtualclass.sharePt.order.indexOf(id);
        //                 if (idIndex >= 0) {
        //                     virtualclass.sharePt.order.splice(idIndex, 1)
        //                     console.log(virtualclass.sharePt.order);
        //                     virtualclass.sharePt.xhrOrderSend(virtualclass.sharePt.order);
        //                 }
        //             }
        //
        //             if(virtualclass.sharePt.currId == id ){
        //                 // if(type !="yts"){
        //                 var ptCont = document.querySelector("#pptiframe");
        //                 if(ptCont){
        //                     ptCont.removeAttribute("src");
        //                     ioAdapter.mustSend({pptMsg: "deletePrt", cf: 'ppt',currId:virtualclass.sharePt.currId});
        //                     virtualclass.sharePt.currId = null;
        //                     virtualclass.sharePt.pptUrl=null;
        //
        //                 }
        //             }
        //
        //
        //         }
        //     }
        // });
      },
      afterDeletePtCallback(msg, id) {
        if (msg != 'ERROR') {
          const elem = document.getElementById(`linkppt${id}`);
          if (elem) {
            elem.parentNode.removeChild(elem);
            // virtualclass.videoUl.order=[];
            if (virtualclass.sharePt.ppts.length) {
              virtualclass.sharePt.ppts.forEach((ppt, index) => {
                if (ppt.fileuuid == id) {
                  var index = virtualclass.sharePt.ppts.indexOf(ppt);
                  if (index >= 0) {
                    virtualclass.sharePt.ppts.splice(index, 1);
                    console.log(virtualclass.sharePt.ppts);
                  }
                }
              });
              const idIndex = virtualclass.sharePt.order.indexOf(id);
              if (idIndex >= 0) {
                virtualclass.sharePt.order.splice(idIndex, 1);
                console.log(virtualclass.sharePt.order);
                virtualclass.vutil.sendOrder('presentation', virtualclass.sharePt.order);
              }
              const slide = document.querySelector('.congrea #pptiframe');
              if (slide && slide.getAttribute('src')) {
                virtualclass.vutil.showFinishBtn();
              } else {
                virtualclass.vutil.removeFinishBtn();
              }
            }
            if (virtualclass.sharePt.currId == id) {
              // if(type !="yts"){
              const ptCont = document.querySelector('#pptiframe');
              if (ptCont) {
                ptCont.removeAttribute('src');
                ioAdapter.mustSend({
                  pptMsg: 'deletePrt',
                  cf: 'ppt',
                  currId: virtualclass.sharePt.currId,
                });
                virtualclass.sharePt.currId = null;
                virtualclass.sharePt.pptUrl = null;
                virtualclass.vutil.removeFinishBtn();
              }
            }
          }
        }
      },


      _delete1(id) {
        const data = {
          uuid: id,
          action: 'delete',
          page: 0,
        };
        const videoid = id;
        const url = virtualclass.api.UpdateDocumentStatus;
        const that = this;
        // virtualclass.xhrn.sendFormData({uuid:videoid}, url, function (msg) {
        //     that.afterDeleteCallback(msg)
        // });
        virtualclass.xhrn.vxhrn.post(url, data).then((msg) => {
          that.afterDeleteCallback(msg.data, id);
        });
      },

      // afterDeleteCallback : function (msg, id){
      //     if (msg != "ERROR") {
      //         var type ="saved";
      //         var elem = document.getElementById("linkvideo" + id);
      //         if (elem) {
      //             if(elem.classList.contains("yts")){
      //                 type="yts"
      //             }else if(elem.classList.contains("online")){
      //                 type="online";
      //             }
      //             elem.parentNode.removeChild(elem);
      //             //virtualclass.videoUl.order=[];
      //
      //             if(virtualclass.videoUl.videoId == id ){
      //                 // if(type !="yts"){
      //                 var playerCont = document.querySelector("#videoPlayerCont");
      //                 if(playerCont){
      //                     playerCont.style.display="none";
      //                     ioAdapter.mustSend({'videoUl':'videoDelete', 'cf': 'videoUl'});
      //
      //                     virtualclass.videoUl.videoId = null;
      //                     virtualclass.videoUl.videoUrl = null;
      //                 }
      //             }
      //             if(virtualclass.videoUl.videos && virtualclass.videoUl.videos.length){
      //                 virtualclass.videoUl.videos.forEach(function (video, index) {
      //                     if (video["id"] == id) {
      //                         var index = virtualclass.videoUl.videos.indexOf(video)
      //                         if (index >= 0) {
      //                             virtualclass.videoUl.videos.splice(index, 1)
      //                             console.log(virtualclass.videoUl.videos);
      //                         }
      //                     }
      //                 })
      //             }
      //
      //             var idIndex = virtualclass.videoUl.order.indexOf(id);
      //             if (idIndex >= 0) {
      //                 virtualclass.videoUl.order.splice(idIndex, 1)
      //                 console.log(virtualclass.videoUl.order);
      //                 virtualclass.videoUl.xhrOrderSend(virtualclass.videoUl.order);
      //             }
      //         }
      //     }
      // },


      /*
       * Set the autoslide configation value from local storage to iniline variables
       */
      pptMessageEventHandler(event) {
        if (virtualclass.currApp == 'SharePresentation') {
          var frame = document.getElementById('pptiframe');
          var pptData = event.data;
          var pptData = (typeof pptData === 'string') ? JSON.parse(event.data) : event.data;

          if (typeof pptData !== 'undefined') {
            if (pptData.hasOwnProperty('namespace') && pptData.namespace == 'reveal') {
              virtualclass.sharePt.state = pptData.state;
            }
            // only proceed ahead if the namespace is revealjs paramter, if found another case instead of revealjs
            // we need to add over here

            if (pptData.eventName == 'ready') {
              // TODO validate startFromFlag and localStoragFlag nirmala
              if (virtualclass.sharePt.localStoragFlag && !virtualclass.sharePt.startFromFlag) {
                const state = virtualclass.sharePt.stateLocalStorage;
                frame.contentWindow.postMessage(JSON.stringify({
                  method: 'slide',
                  args: [state.indexh, state.indexv, state.indexf],
                }), '*');
                virtualclass.sharePt.localStoragFlag = 0;
              } else if (virtualclass.sharePt.startFromFlag) {
                frame.contentWindow.postMessage(JSON.stringify({
                  method: 'slide',
                  args: virtualclass.sharePt.startFrom,
                }), '*');
              }

              /**
               * To know the auto slide is enable or not
               * There is no good way to find this, will explore it about later
               * TODO remove time and test properly Nirmala
               * * */
              setTimeout(() => {
                if (frame != null) {
                  if (frame.contentWindow != null) {
                    frame.contentWindow.postMessage(JSON.stringify({ method: 'toggleAutoSlide' }), '*');
                  }
                }
              }, 1500);
            }

            if (roles.hasView()) {
              if (pptData.eventName == 'ready') {
                // virtualclass.sharePt.studentPptReadyFlag = 1;
                /** Need bit delay * */
                setTimeout(() => {
                  virtualclass.sharePt.removeControls();
                }, 100);

                if (virtualclass.sharePt.studentPpt) {
                  virtualclass.sharePt.setSlideState(virtualclass.sharePt.studentPpt);
                  virtualclass.sharePt.studentPpt = 0;
                  // virtualclass.sharePt.studentPptReadyFlag = 0;
                }
              }
            } else if (roles.hasControls()) {
              console.log(pptData.eventName);
              if (typeof pptData.eventName !== 'undefined') {
                virtualclass.sharePt[pptData.eventName].call(virtualclass.sharePt, pptData);
                virtualclass.sharePt.state = pptData.state;
              }
            }
          }
        } else if (frame != null) {
          frame.removeAttribute('src');
        }
      },
      setAutoSlideConfig() {
        if (localStorage.getItem('autoSlideTime')) {
          virtualclass.sharePt.autoSlideTime = JSON.parse(localStorage.getItem('autoSlideTime'));
          virtualclass.sharePt.autoSlideFlag = JSON.parse(localStorage.getItem('autoSlideFlag'));
        }
      },
      /*
       * student receives ppt message
       * @param  msg ppt msg from the sender

       */
      onmessage(msg) {
        if (msg.hasOwnProperty('autoSlide')) {
          this.autoSlideTime = msg.autoSlide;
        }
        if (typeof virtualclass.sharePt !== 'undefined') {
          virtualclass.system.setAppDimension(virtualclass.currApp);
          this.onPptMsgReceive(msg);
          const pptContainer = document.getElementById(virtualclass.sharePt.UI.id);
          if (!pptContainer.classList.contains('pptSharing')) {
            pptContainer.classList.add('pptSharing');
          }
        }
      },
      ready(pptData) {
        console.log('teacher ready for ppt ');
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },
      /*
       * function to be called when slidechange event fired at teacher's end
       * @param  pptData event data
       */
      slidechanged(pptData) {
        if (this.autoSlideFlag && this.autoSlideResumed && !this.autoSlideTime) {
          this.calculateAutoSlideTime(pptData);
        }
        ioAdapter.mustSend({
          pptMsg: pptData, cf: 'ppt', autoSlide: this.autoSlideTime, cfpt: 'setPEvent',
        });
      },

      /*
       * We are calculating the autoslide time based on automatic slide changed
       for example at very first, the auto slide is paused, after that if presenter resume the auto slide and slidechanged event
       is occured then the below function caculated autoslide time, It does not caculate the time when autolide is paused and
       use click on next/prev slide button to change the slide, in that time we give the default time is 6 second.
       This time is required when student become presenter, we are storing two time stamps for compare
       */
      calculateAutoSlideTime(pptData) {
        this.eventsObj.push({ name: pptData.eventName, time: Date.now() });
        if (this.eventsObj.length >= 2) {
          if (this.eventsObj[0].name == 'slidechanged' && this.eventsObj[1].name == 'slidechanged') {
            // perform only in rearest case,
            this.autoSlideTime = this.eventsObj[1].time - this.eventsObj[0].time;
            console.log(`auto slide time withoutpause${this.autoSlideTime}`);
          } else if (this.eventsObj[0].name == 'autoslideresumed' && this.eventsObj[1].name == 'slidechanged') {
            this.autoSlideTime = this.eventsObj[1].time - this.eventsObj[0].time;
            console.log(`withpause${this.autoSlideTime}`);
          }
          console.log(this.eventsObj);
          console.log(this.autoSlideTime);
        }
      },
      /*
       * function to be called when auto slide paused
       * @param  pptData paused event data

       */
      autoslidepaused(pptData) {
        this.autoSlideFlag = 1; // To find that autoSlide is enabled or not
        this.autoSlideResumed = 0; // To konw auto slide is resumed or not
        console.log(this.pause);
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },
      /*
       * function to be called when auto slide resumed at teacher's end
       * @param  pptData event data
       */
      autoslideresumed(pptData) {
        // this.autoSlideResumed
        this.autoSlideFlag = 1;
        this.autoSlideResumed = 1;
        this.eventsObj = [];
        this.eventsObj.push({ name: pptData.eventName, time: Date.now() });
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },
      /*
       * function to be called when fragment shown event fired at teacher's end
       * @param  pptData event data
       */
      fragmentshown(pptData) {
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },
      /*
       * function to be called when fragment hidden event fired  at teacher's end
       * @param  pptData event data
       */
      fragmenthidden(pptData) {
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },
      /*
       * function to be called when overview shown event fired at  teacher's end
       * @param  pptData event data
       */
      overviewshown(pptData) {
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },
      /*
       * function to be called when overview hidden event fired  at teacher's end
       * @param  pptData event data
       */
      overviewhidden(pptData) {
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },

      paused(pptData) {
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },
      resumed(pptData) {
        ioAdapter.mustSend({ pptMsg: pptData, cf: 'ppt', cfpt: 'setPEvent' });
      },

      /*
       *Removes control from student's end
       *and removes auto slide also
       *
       */
      removeControls() {
        setTimeout(() => {
          const frame = document.getElementById('pptiframe');
          frame.contentWindow.postMessage(JSON.stringify({
            method: 'configure',
            args: [{
              controls: false, autoSlide: 0, keyboard: false, progress: false, touch: false,
            }],
          }), '*');
        }, 100);
      },
      // custom function presentation
      cfpt: {
        displayFrame() {
          this.displayFrame();
        },

        setUrl(receivemsg) {
          virtualclass.sharePt.localStoragFlag = 0;
          virtualclass.sharePt.stateLocalStorage = {};
          virtualclass.sharePt.state = { indexh: 0, indexv: 0, indexf: 0 };
          this.setSlideUrl(receivemsg);
          const frame = document.getElementById('pptiframe');
          frame.onload = function () {
            if (roles.hasView()) {
              if (frame.contentWindow != null) {
                if (typeof receivemsg.pptMsg.state !== 'undefined') {
                  frame.contentWindow.postMessage(JSON.stringify({
                    method: 'setState',
                    args: [receivemsg.pptMsg.state],
                  }), '*');
                }
              }
            }
          };
        },

        setPEvent(receivemsg) {
          const frame = document.getElementById('pptiframe');
          if (frame != null) {
            virtualclass.sharePt.setSlideState(receivemsg.pptMsg);
          }
          this.state = receivemsg.pptMsg.state;
        },
      },

      /*
       * Creates the layout at the  student's side
       * Sets Url of the slide and after that sets state on receiveing changed state from the sender
       * @param receivemsg  received message by the student
       */
      onPptMsgReceive(receivemsg) {
        if (typeof receivemsg.ppt !== 'undefined') {
          if (typeof receivemsg.ppt.startFrom !== 'undefined') {
            virtualclass.sharePt.startFromFlag = 1;
            var frame = document.getElementById('pptiframe');
            if (frame != null) {
              if (receivemsg.ppt.init.search('postMessage') < 0) {
                frame.setAttribute('src', `${receivemsg.ppt.init}?postMessage=true&postMessageEvents=true`);
              } else {
                frame.setAttribute('src', receivemsg.ppt.init);
              }
              virtualclass.sharePt.startFrom = [receivemsg.ppt.startFrom.indexh, receivemsg.ppt.startFrom.indexv, receivemsg.ppt.startFrom.indexf];
            }
          }
        }

        if (typeof receivemsg.pptMsg !== 'undefined') {
          if (receivemsg.pptMsg == 'deletePrt') {
            const ptCont = document.querySelector('#pptiframe');
            if (ptCont) {
              ptCont.removeAttribute('src');
              virtualclass.sharePt.currId = null;
              virtualclass.sharePt.pptUrl = null;

              const msg = document.querySelector('#virtualclassCont.congrea #virtualclassSharePresentation #pptMessageLayout');
              if (msg) {
                msg.style.display = 'block';
              }
            }
          } else {
            var frame = document.getElementById('pptiframe');
            var msgLayout = document.getElementById('pptMessageLayout');
            if (frame != null) {
              frame.onload = function () {
                if (roles.hasView()) {
                  if (frame.contentWindow != null) {
                    if (typeof receivemsg.pptMsg.state !== 'undefined') {
                      frame.contentWindow.postMessage(JSON.stringify({
                        method: 'setState',
                        args: [receivemsg.pptMsg.state],
                      }), '*');
                    }
                  }
                }
              };
            }
          }

          if (msgLayout != null) {
            msgLayout.style.display = 'none';
          }


          if (receivemsg.hasOwnProperty('cfpt') && typeof receivemsg.cfpt !== 'undefined' && typeof virtualclass.sharePt.cfpt[receivemsg.cfpt] !== 'undefined') {
            virtualclass.sharePt.cfpt[receivemsg.cfpt].call(virtualclass.sharePt, receivemsg);
          }
        }
      },
      /*
       * calls function to create the ppt container at students end
       * @param  receivemsg ppt data recevied from the teacher
       */
      displayFrame() {
        // virtualclass.sharePt.localStoragFlag=0;
        virtualclass.system.setAppDimension(virtualclass.currApp);
        const pptContainer = document.getElementById(virtualclass.sharePt.UI.id);
        if (!pptContainer.classList.contains('pptSharing')) {
          pptContainer.classList.add('pptSharing');
        }
      },
      /*
       * Set url of the slide at student's side
       * @param receivemsg received message from the sender containg the url of the slide
       */
      setSlideUrl(receivemsg) {
        if (receivemsg.pptMsg != null && receivemsg.pptMsg != '') {
          virtualclass.sharePt.studentPpt = 0;
          console.log('PPT:- invoke setSlideUrl');
          this.viewFlag = 0;
          this.autoSlideFlag = 0;
          this.autoSlideTime = 0;
          var iframe = document.getElementById('pptiframe');
          if (iframe != null) {
            iframe.parentNode.removeChild(iframe);
          }
          console.log('create iframe from setslide url');
          this.UI.createIframe();
          const elem = document.getElementById('iframecontainer');
          elem.style.display = 'block';
          var iframe = document.getElementById('pptiframe');

          iframe.setAttribute('src', (receivemsg.pptMsg.search('postMessage') < 0) ? `${receivemsg.pptMsg}?postMessage=true&postMessageEvents=true` : receivemsg.pptMsg);
          console.log('test url is set');
          this.pptUrl = receivemsg.pptMsg;
        }

        virtualclass.sharePt.localStoragFlag = 0;
        virtualclass.sharePt.startFromFlag = 0;
      },
      /*
       * sets state at student's end as it is changed on teacher's end
       * @param  receivemsg contains event received corresponding to state change on teacher's side

       */
      setSlideState(msg) {
        const frame = document.getElementById('pptiframe').contentWindow;
        const indexArg = [msg.state.indexh, msg.state.indexv, msg.state.indexf];
        const stateArg = [msg.state];
        const eventReceived = msg.eventName;
        switch (eventReceived) {
          case 'ready':
            frame.postMessage(JSON.stringify({ method: 'setState', args: stateArg }), '*');
            break;
          case 'slidechanged':
            virtualclass.sharePt.studentPpt = msg;
            console.log('test PPt:-  changed');
            frame.postMessage(JSON.stringify({ method: 'slide', args: indexArg }), '*');
            break;
          case 'autoslidepaused':
            this.autoSlideFlag = 1;
            frame.postMessage(JSON.stringify({ method: 'toggleAutoSlide' }), '*');
            break;
          case 'autoslideresumed':
            this.autoSlideFlag = 1;
            frame.postMessage(JSON.stringify({ method: 'toggleAutoSlide' }), '*');
            break;
          case 'fragmentshown':
            frame.postMessage(JSON.stringify({ method: 'slide', args: indexArg }), '*');
            break;
          case 'fragmenthidden':
            frame.postMessage(JSON.stringify({ method: 'slide', args: indexArg }), '*');
            break;
          case 'overviewshown':
            frame.postMessage(JSON.stringify({ method: 'setState', args: stateArg }), '*');
            break;
          case 'overviewhidden':
            frame.postMessage(JSON.stringify({ method: 'setState', args: stateArg }), '*');
            frame.postMessage(JSON.stringify({ method: 'slide', args: indexArg }), '*');
          default:
            console.log('There is no event is occured');
        }
      },

      toProtocolRelativeUrl() {
        const url = virtualclass.sharePt.urlValue;
        if (url.indexOf('http') >= 0) {
          return url.replace(/http:\/\/|https:\/\//, '//');
        }
        return (`//${url}`);
      },
      /**
       * validate the url and return validated url
       * @returns {*}
       */
      validUrl() {
        if (virtualclass.sharePt.isUrlip(virtualclass.sharePt.urlValue)) {
          return virtualclass.sharePt.cleanupUrl(virtualclass.sharePt.urlValue);
        } if (virtualclass.sharePt.urlValue.search('<iframe') > 0) {
          return virtualclass.sharePt.extractUrl(virtualclass.sharePt.urlValue);
        } if (virtualclass.sharePt.validURLWithDomain(virtualclass.sharePt.urlValue)) {
          return virtualclass.sharePt.completeUrl(virtualclass.sharePt.cleanupUrl(virtualclass.sharePt.urlValue));
        }
        return false;
      },

      /*
       *event handler on click of submit button of the url at teacher's end
       *Calls function to set up the url
       *calls function to validate the entered url
       * @param receivemsg  received message by the student
       */
      initNewPpt() {
        virtualclass.sharePt.urlValue = document.getElementById('presentationurl').value;
        virtualclass.sharePt.urlValue = virtualclass.sharePt.toProtocolRelativeUrl();
        const vUrl = virtualclass.sharePt.validUrl();
        if (vUrl) {
          virtualclass.sharePt.savePptUrl(vUrl);
          document.getElementById('presentationurl').value = '';
        } else {
          virtualclass.popup.validateurlPopup('presentation');
          // alert('Please enter a valid URL');
        }
      },
      savePptUrl(vUrl) {
        const id = virtualclass.vutil.createHashString(vUrl) + virtualclass.vutil.randomString(32).slice(1, -1);
        const pptObj = {};
        pptObj.uuid = id;
        pptObj.URL = vUrl;
        pptObj.title = vUrl;
        const url = virtualclass.api.addURL;
        pptObj.type = 'presentation';
        const that = this;

        virtualclass.xhrn.vxhrn.post(url, pptObj).then(() => {
          if (virtualclass.sharePt.hasOwnProperty('activeppts')) {
            const ppts = virtualclass.sharePt.activeppts.map(ppt => ppt.fileuuid);
            if (ppts.length != virtualclass.sharePt.order.length) {
              virtualclass.sharePt.order = ppts;
            }
          }

          virtualclass.sharePt.order.push(pptObj.uuid);
          virtualclass.vutil.sendOrder('presentation', virtualclass.sharePt.order);
          virtualclass.sharePt.getPptList();
          that.fetchAllData();

          // // TODO, Critical this need be re-enable
          // virtualclass.videoUl.xhrOrderSend(virtualclass.videoUl.order);
        });
      },

      fetchAllData() {
        virtualclass.serverData.fetchAllData(() => {
          virtualclass.sharePt.awsPresentationList(virtualclass.serverData.rawData.ppt);
        });
      },

      awsPresentationList(ppts) {
        virtualclass.sharePt.ppts = [];

        // var data = virtualclass.awsData;
        // for(var i =0;i<data.length;i++){
        //     if(data[i]["filetype"]=="presentation" ){
        //         virtualclass.sharePt.ppts.push(data[i])
        //     }
        // }

        virtualclass.sharePt.ppts = ppts;

        const db = document.querySelector('#SharePresentationDashboard .dbContainer');
        if (db) {
          virtualclass.sharePt.createPageModule();
          virtualclass.sharePt.showPpts();
          virtualclass.vutil.requestOrder('presentation', (response) => {
            if (virtualclass.vutil.isResponseAvailable(response)) {
              virtualclass.sharePt.order = response;
              if (virtualclass.sharePt.order && virtualclass.sharePt.order.length > 0) {
                virtualclass.sharePt.reArrangeElements(virtualclass.sharePt.order);
              }
            } else {
              console.log('Order response is not available');
            }
          });
          // virtualclass.sharePt.retrieveOrder();
        }


        // console.log(videos);
        // virtualclass.videoUl.videos = videos;

        // virtualclass.videoUl.allPages = content;
        // var type = "video";
        // var firstId = "congrea" + type + "ContBody";
        // var secondId = "congreaShareVideoUrlCont";
        // var elemArr = [firstId, secondId];
        // virtualclass.videoUl.showVideos(videos);
        // virtualclass.videoUl.retrieveOrder();
      },

      afterPptSaved(pptObj) {
        const idPostfix = pptObj.fileuuid;
        // var docId = 'docs' + doc;

        if (pptObj.hasOwnProperty('disabled')) {
          pptObj.status = 0;
        } else {
          pptObj.status = 1;
        }


        this.pages[idPostfix] = new virtualclass.page('pptListContainer', 'ppt', 'virtualclassSharePresentation', 'sharePt', pptObj.status);
        this.pages[idPostfix].init(idPostfix, pptObj.URL);
        this.pptClickHandler(pptObj);
        const ppt = document.getElementById(`linkppt${pptObj.fileuuid}`);
        const titleCont = document.getElementById(`pptTitle${pptObj.fileuuid}`);
        const title = this.extractTitle(pptObj.URL);

        if (titleCont) {
          if (title) {
            titleCont.innerHTML = title;
          } else {
            let ul = pptObj.URL;
            ul = `https:${ul}`;
            const urlPattern = /^(?:https?:\/\/)?(?:w{3}\.)?([a-z\d\.-]+)\.(?:[a-z\.]{2,10})(?:[/\w\.-]*)*/;
            const domainPattern = ul.match(urlPattern);
            const extractDomain = domainPattern[1];

            titleCont.innerHTML = extractDomain;
          }
        }
        titleCont.setAttribute('data-toogle', 'tooltip');
        titleCont.setAttribute('data-placement', 'bottom');
        titleCont.setAttribute('title', pptObj.URL);

        if (pptObj.hasOwnProperty('disabled')) {
          this._disable(pptObj.fileuuid);
          if (ppt) {
            ppt.classList.add('disable');
          }
        } else {
          this._enable(pptObj.fileuuid);
          if (ppt) {
            ppt.classList.add('enable');
          }
        }
        if (virtualclass.sharePt.currId == pptObj.fileuuid) {
          ppt.classList.add('playing');
        }
      },
      extractTitle(url) {
        let title;
        if (url.indexOf('//') > -1) {
          title = url.split('/')[4];
        } else {
          title = url.split('/')[2];
        }

        return title;
      },
      pptClickHandler(pptObj) {
        const ppt = document.getElementById(`mainpppt${pptObj.fileuuid}`);
        if (ppt) {
          ppt.addEventListener('click', () => {
            virtualclass.sharePt.playPptUrl(pptObj.URL, pptObj.fileuuid);
            virtualclass.dashBoard.close();
            virtualclass.sharePt.currId = pptObj.fileuuid;
            virtualclass.sharePt.activePrs(pptObj.fileuuid);
          });
        }
      },
      activePrs(id) {
        const otherElems = document.querySelectorAll('#virtualclassCont.congrea .linkppt');
        for (let i = 0; i < otherElems.length; i++) {
          if (otherElems[i].classList.contains('playing')) {
            otherElems[i].classList.remove('playing');
          }
        }

        const currentPpt = document.querySelector(`#virtualclassCont.congrea #linkppt${id}`);
        if (currentPpt && !currentPpt.classList.contains('playing')) {
          currentPpt.classList.add('playing');
        }
      },

      _disable(_id) {
        const ppt = document.getElementById(`mainpppt${_id}`);
        ppt.style.opacity = 0.3;
        ppt.style.pointerEvents = 'none';

        const link = document.querySelector(`#linkppt${_id}`);
        if (link.classList.contains('enable')) {
          link.classList.remove('enable');
        }
        link.classList.add('disable');


        if (virtualclass.sharePt.ppts && virtualclass.sharePt.ppts.length) {
          virtualclass.sharePt.ppts.forEach((elem, i) => {
            if (elem.fileuuid == _id) {
              elem.disabled = 0;
              elem.status = 0;
            }
          });
        }
      },

      /*
       * to enable  ppt in the pptlist
       */
      _enable(_id) {
        const link = document.querySelector(`#linkppt${_id}`);
        if (link.classList.contains('disable')) {
          link.classList.remove('diable');
        }
        link.classList.add('enable');


        const ppt = document.getElementById(`mainpppt${_id}`);
        if (ppt) {
          ppt.style.opacity = 1;
          ppt.style.pointerEvents = 'auto';
          if (virtualclass.sharePt.ppts && virtualclass.sharePt.ppts.length) {
            virtualclass.sharePt.ppts.forEach((elem, i) => {
              if (elem.fileuuid == _id) {
                delete (elem.disabled);
                elem.status = 1;
              }
            });
          }
        }
      },

      getPptList() {
        if (virtualclass.gObj.fetchedData) {
          virtualclass.sharePt.awsPresentationList(virtualclass.serverData.rawData.ppt);
        } else {
          this.fetchAllData();
        }
      },

      showPpts(content) {
        // var list = document.getElementById("videoList");
        const elem = document.getElementById('listppt');
        if (elem) {
          for (let i = 0; i < elem.childNodes.length - 1; i++) {
            elem.childNodes[i].parentNode.removeChild(elem.childNodes[i]);
          }
        }

        if (virtualclass.sharePt.ppts && virtualclass.sharePt.ppts.length) {
          virtualclass.sharePt.activeppts = [];
          virtualclass.sharePt.ppts.forEach((pptObj, i) => {
            if (!pptObj.hasOwnProperty('deleted')) {
              virtualclass.sharePt.activeppts.push(pptObj);
              const elem = document.querySelector(`#linkppt${pptObj.fileuuid}`);
              if (elem != null) {
                elem.classList.remove('noPpt');
              }
              virtualclass.sharePt.afterPptSaved(pptObj);
            }
            // virtualclass.sharePt.afterPptSaved(pptObj);
          });
          virtualclass.vutil.sendOrder('presentation', virtualclass.sharePt.order);
        }

        const slide = document.querySelector('.congrea #pptiframe');
        if (slide && slide.getAttribute('src')) {
          virtualclass.vutil.showFinishBtn();
        }

        // todo to verify this
        // virtualclass.vutil.makeElementDeactive('#VideoDashboard .qq-uploader-selector.qq-uploader.qq-gallery');
        virtualclass.vutil.makeElementActive('#listvideo');
      },

      retrieveOrder() {
        const rdata = new FormData();
        rdata.append('live_class_id', virtualclass.gObj.congCourse);
        rdata.append('content_order_type', '3');
        this.requestOrder(rdata);
      },

      requestOrder(rdata) {
        virtualclass.vutil.requestOrder('presentation', (data) => {
          console.log(data);
          if (virtualclass.vutil.isResponseAvailable(data)) {
            virtualclass.sharePt.order = data;
            if (virtualclass.sharePt.order.length > 0) {
              virtualclass.sharePt.reArrangeElements(virtualclass.sharePt.order);
            }
          }
        });
      },

      playPptUrl(vUrl) {
        virtualclass.sharePt.autoSlideTime = 0;
        virtualclass.sharePt.autoSlideFlag = 0;
        virtualclass.sharePt.localStoragFlag = 0;
        virtualclass.sharePt.startFromFlag = 0;

        virtualclass.sharePt.eventsObj = [];
        virtualclass.sharePt.state = { indexh: 0, indexv: 0, indexf: 0 };
        virtualclass.sharePt.stateLocalStorage = {};

        localStorage.removeItem('autoSlideTime');
        localStorage.removeItem('autoSlideFlag');

        const iframecontainer = document.getElementById('iframecontainer');
        if (iframecontainer == null) {
          console.log('call of iframe creater from onclick event handler');
          virtualclass.sharePt.UI.createIframe();
        }

        const pptContainer = document.getElementById(virtualclass.sharePt.UI.id);
        if (!pptContainer.classList.contains('pptSharing')) {
          pptContainer.classList.add('pptSharing');
        }

        virtualclass.sharePt.setPptUrl(vUrl);

        virtualclass.system.setAppDimension(); // add just the height of screen container
      },
      /*
       * Removes unnessary characters from the entered url, url copied from slides.com may contain hash
       * @param hashedUrl url entered by the user
       */
      cleanupUrl(hashedUrl) {
        const hashPos = hashedUrl.search('#');
        if (hashPos > 0) {
          var hashedUrl = hashedUrl.slice(0, hashPos);
        }
        return hashedUrl;
      },
      /*
       * Assign frame's src as the url of the slide
       * @param urlValue of the slide to be set in appropriate format
       */
      setPptUrl(urlValue) {
        console.log('test+set ppt url function');
        const elem = document.getElementById('iframecontainer');
        elem.style.display = 'block';

        const frame = document.getElementById('pptiframe');
        console.log(`completeurl${urlValue}`);
        virtualclass.sharePt.pptUrl = `${urlValue}?postMessage=true&postMessageEvents=true`;

        frame.setAttribute('src', virtualclass.sharePt.pptUrl);
        ioAdapter.mustSend({
          pptMsg: 'displayframe', cf: 'ppt', user: 'all', cfpt: 'displayframe',
        });
        ioAdapter.mustSend({
          pptMsg: urlValue, cf: 'ppt', user: 'all', cfpt: 'setUrl',
        });
        frame.style.display = 'visible';

        const btn = document.querySelector('.congrea  #dashboardContainer .modal-header button.enable');
        if (!btn) {
          virtualclass.vutil.showFinishBtn();
        }
      },
      /*
       * Validate url
       * @param str url to validate
       */
      validURLWithDomain(str) {
        return /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(str);
        // var regex = /((http|https)?:\/\/)?(slides.com)\/{1,255}\s*/;
        // return regex.test(str);
      },
      /*
       * adding embed and https if not present in the url
       * @param str completing the url
       */
      completeUrl(str) {
        if (str.search('slides.com') > 0 && str.search('embed') < 0) {
          str += '/embed';
        }
        return str;
      },


      /*
       * extract url from the complete iframe text
       * @param str complete embedded iframe text is entered in the textbox
       */

      extractUrl(str) {
        if (str.search('src') > 0) {
          const pos = str.match(/"(.*?)"/);
          if (pos.length > 0) {
            return JSON.parse(pos[0]);
          }
        }
        return str;
      },

      /*
       * if entered url is an ip address return true else return false
       * @param str to check for an ip
       */
      isUrlip(str) {
        // removing // from url
        str.slice(0, 2);
        return (/(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/.test(str));
      },
      /*
       * Save the previous  objet in the localstorag on page refresh
       * @param prvAppObj previous object it shareppt object
       */
      saveIntoLocalStorage(prvAppObj) {
        if (this.validURLWithDomain(prvAppObj.metaData.init) || this.isUrlip(prvAppObj.metaData.init)) {
          localStorage.setItem('prevApp', JSON.stringify(prvAppObj));
          console.log('ppt_state', prvAppObj.metaData.startFrom);
          localStorage.setItem('ppt_state', JSON.stringify(prvAppObj.metaData.startFrom));
          console.log('savinlocal');

          localStorage.setItem('pptUrl', JSON.stringify(prvAppObj.metaData.init));
          localStorage.setItem('autoSlideTime', JSON.stringify(virtualclass.sharePt.autoSlideTime));
          localStorage.setItem('autoSlideFlag', JSON.stringify(virtualclass.sharePt.autoSlideFlag));
        }
      },
      initTeacherLayout() {
        const frame = document.getElementById('pptiframe');
        if (document.getElementById('pptiframe') != null) {
          const configValues = {
            controls: true, keyboard: true, progress: true, touch: true,
          };
          let autoSlideTime;

          if (virtualclass.sharePt.autoSlideTime && virtualclass.sharePt.autoSlideFlag) {
            autoSlideTime = virtualclass.sharePt.autoSlideTime;
          } else if (virtualclass.sharePt.autoSlideFlag) {
            autoSlideTime = 6000;
          }

          if (typeof autoSlideTime !== 'undefined' && autoSlideTime > 1000) {
            configValues.autoSlide = autoSlideTime;
          }

          // frame.contentWindow.postMessage(JSON.stringify({method: "configure", args: [{controls: true,keyboard:true,progress:true,touch:true}]}), '*');
          frame.contentWindow.postMessage(JSON.stringify({ method: 'configure', args: [configValues] }), '*');
          frame.contentWindow.postMessage(JSON.stringify({ method: 'toggleAutoSlide' }), '*');
        }
        const pptMessageLayout = document.getElementById('pptMessageLayout');
        if (pptMessageLayout != null) {
          pptMessageLayout.style.display = 'none';
        }
        // virtualclass.sharePt.UI.createUrlContainer();
        if (document.getElementById('urlcontainer')) {
          document.getElementById('urlcontainer').style.display = 'block';
        }

        virtualclass.sharePt.eventsObj = [];
      },


      initStudentLayout() {
        const frame = document.getElementById('pptiframe');
        virtualclass.sharePt.eventsObj = [];
        virtualclass.sharePt.UI.messageDisplay();


        if (document.getElementById('pptiframe') != null) {
          if (frame.src != '') {
            virtualclass.sharePt.hideElement('pptMessageLayout');
          }
          frame.contentWindow.postMessage(JSON.stringify({
            method: 'configure',
            args: [{
              controls: false,
              autoSlide: 0,
              autoSlideStoppable: true,
              keyboard: false,
              progress: false,
              touch: false,
            }],
          }), '*');
        } else {
          virtualclass.sharePt.displayElement('pptMessageLayout');
        }
        virtualclass.sharePt.hideElement('urlcontainer');
      },


      hideElement(id) {
        const element = document.getElementById(id);
        if (element != null) {
          element.style.display = 'none';
        }
      },

      displayElement(id) {
        const element = document.getElementById(id);
        if (element != null) {
          element.style.display = 'block';
        }
      },


      attachEvent(id, eventName, handler) {
        var elem = document.getElementById(id);
        var elem = document.getElementById(id);
        if (elem != null) {
          elem.addEventListener(eventName, handler);
        }
      },
      attachMessageEvent(eventName, messageHandler) {
        window.addEventListener(eventName, messageHandler);
      },

      UI: {
        id: 'virtualclassSharePresentation',
        class: 'virtualclass',
        /*
         * Creates container for the ppt
         */
        container() {
          const control = !!roles.hasControls();
          const data = { control };
          const template = virtualclass.getTemplate('ppt', 'ppt');
          // $('#virtualclassAppLeftPanel').append(template(data));
          virtualclass.vutil.insertAppLayout(template(data));
          // var btn = document.querySelector("#virtualclassCont #pptuploadContainer #submitpurl");
          // btn.addEventListener('click',function(){
          //     virtualclass.sharePt.initNewPpt();
          // })
        },
        /*
         *
         * Creates iframecontainer and iframe for the ppt
         */
        createIframe() {
          const ct = document.getElementById('iframecontainer');
          if (ct != null) {
            ct.parentNode.removeChild(ct);
          }

          const template = virtualclass.getTemplate('pptiframe', 'ppt');


          const pptCont = document.querySelector('#virtualclassSharePresentation');
          pptCont.insertAdjacentHTML('beforeend', template());
          // $('#virtualclassSharePresentation').append(template)
        },


        /*
         *
         * display message on student's screen that ppt is going to be shared
         */
        messageDisplay() {
          const msg = document.getElementById('pptMessageLayout');
          if (msg) {
            msg.parentNode.removeChild(msg);
          }

          const template = virtualclass.getTemplate('mszdisplay', 'ppt');
          const pptCont = document.querySelector('#virtualclassSharePresentation');
          pptCont.insertAdjacentHTML('beforeend', template());
        },

        removeIframe() {
          const elem = document.getElementById('pptiframe');
          if (elem) {
            elem.parentNode.removeChild(elem);
          }
        },

      },
    };
  };
  window.sharePt = sharePt;
}(window));
