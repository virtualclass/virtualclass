var ioStorage = {

  dataAdapterStore(allData, serialKey) {
    if (typeof virtualclass.storage === 'object' && typeof virtualclass.storage.db === 'object') {
      virtualclass.storage.dataAdapterAllStore(JSON.stringify(allData), serialKey);
      // virtualclass.storage.storeMustData(JSON.stringify(allData), serialKey);
      // ioStorage.mustDataStore(JSON.stringify(allData), [virtualclass.gObj.uid, serialKey]);
      // virtualclass.storage.storeMustData(JSON.stringify(allData), [virtualclass.gObj.uid, serialKey]);
    } else {
      setTimeout(
        () => {
          ioStorage.dataAdapterStore(allData, serialKey); // if table of indexeddb is not ready yet.
        },
        10,
      );
    }
  },

  dataUserAdapterMustData(allData, serialKey) {
    // debugger;
    if (typeof virtualclass.storage === 'object' && typeof virtualclass.storage.db === 'object') {
      virtualclass.storage.dataUserAdapterAllStore(JSON.stringify(allData), serialKey);
    } else {
      setTimeout(
        () => {
          // debugger;
          ioStorage.dataUserAdapterMustData(allData, serialKey); // if table of indexeddb is not ready yet.
        },
        10,
      );
    }
  },

  dataExecutedStoreAll(DataExecutedAll, serialKeyWithUser) {
    virtualclass.storage.dataExecutedStoreAll(JSON.stringify(DataExecutedAll), serialKeyWithUser);
  },

  receiveStoreCacheAllData (data) {
    if (typeof data.m === 'object') {
      if (data.m.hasOwnProperty('serial')) {
        this.storeCacheAllData(data.m, [data.user.userid, data.m.serial]);
      } else if (data.m.hasOwnProperty('userSerial')){
        this.storeCacheInData(data.m, [data.user.userid, data.m.userSerial]);
      }
    }
  },

  storeCacheAllData(data, key) {
    virtualclass.storage.storeCacheAll(JSON.stringify(data), key);
  },

  storeCacheOutData(data, key) {
    virtualclass.storage.storeCacheOut(JSON.stringify(data), key);
  },

  storeCacheInData(data, key) {
    virtualclass.storage.storeCacheIn(JSON.stringify(data), key);
  },

  dataExecutedUserStoreAll(DataExecutedUserAll, serialKey) {
    virtualclass.storage.dataExecutedUserStoreAll(JSON.stringify(DataExecutedUserAll), serialKey);
  },

};
