import test from 'ava';
import MemoryBackend from './MemoryBackend';
import BridgeIDBFactory from './BridgeIDBFactory';

test.cb("basics", (t) => {

  const backend = new MemoryBackend();
  const idb = new BridgeIDBFactory(backend);

  const request = idb.open("library");
  request.onupgradeneeded = () => {
    const db = request.result;
    const store = db.createObjectStore("books", {keyPath: "isbn"});
    const titleIndex = store.createIndex("by_title", "title", {unique: true});
    const authorIndex = store.createIndex("by_author", "author");
  
    // Populate with initial data.
    store.put({title: "Quarry Memories", author: "Fred", isbn: 123456});
    store.put({title: "Water Buffaloes", author: "Fred", isbn: 234567});
    store.put({title: "Bedrock Nights", author: "Barney", isbn: 345678});
  };

  request.onsuccess = () => {
    t.end();
  };

  request.onerror = () => {
    t.fail();
  };

});
