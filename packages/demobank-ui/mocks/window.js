Object.defineProperty(window, 'requestAnimationFrame', {
  value: function(cb) {} // Silence the browser.
})

Object.defineProperty(window, 'localStorage', {
  value: {
    store: {},
    getItem: function(key) {
      return this.store[key];
    },
    setItem: function(key, value) {
      return this.store[key] = value;
    },
    clear: function() {
      this.store = {};
    }
  }
});
Object.defineProperty(window, 'location', {
  value: {
    origin: "http://localhost:8080", /* where taler-local rev proxy listens to */
    search: "",
    pathname: "/sandbox/demobanks/default",
  }
})

export default window;
