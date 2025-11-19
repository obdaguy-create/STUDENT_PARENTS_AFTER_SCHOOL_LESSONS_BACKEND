/* app.js - Coursework-compliant Vue 2 frontend (complete file)
   - Vue 2 (Options API)
   - Uses fetch() promises only (no axios / no XHR)
   - Backend endpoints used:
       GET  /lessons
       GET  /search?q=...
       POST /orders
       PUT  /lessons/:id
   */

const BACKEND_BASE = 'http://schooltest-env.eba-kjdsk8eq.ap-south-1.elasticbeanstalk.com'; // <<-- set this to your running backend address


// Build API path 
function apiPath(path) {
  const base = BACKEND_BASE ? BACKEND_BASE.replace(/\/$/, '') : '';
  return `${base}${path}`;
}

new Vue({
  el: '#app',

  data() {
    return {
      //Hard Coded fallback lessons (>=10) - replaced by GET /lessons if backend available
      lessons: [
        { id: 1, subject: 'Math',    location: 'Hendon',     price: 100, spaces: 5, icon: 'fa-solid fa-calculator' },
        { id: 2, subject: 'English', location: 'Colindale',  price: 80,  spaces: 5, icon: 'fa-solid fa-book' },
        { id: 3, subject: 'Science', location: 'Brent Cross',price: 90,  spaces: 5, icon: 'fa-solid fa-flask' },
        { id: 4, subject: 'Art',     location: 'Golders G',  price: 95,  spaces: 5, icon: 'fa-solid fa-palette' },
        { id: 5, subject: 'Music',   location: 'Hendon',     price: 85,  spaces: 5, icon: 'fa-solid fa-music' },
        { id: 6, subject: 'Coding',  location: 'Colindale',  price: 120, spaces: 5, icon: 'fa-solid fa-laptop-code' },
        { id: 7, subject: 'Dance',   location: 'Brent Cross',price: 70,  spaces: 5, icon: 'fa-solid fa-person-dance' },
        { id: 8, subject: 'French',  location: 'Golders G',  price: 75,  spaces: 5, icon: 'fa-solid fa-language' },
        { id: 9, subject: 'History', location: 'Hendon',     price: 65,  spaces: 5, icon: 'fa-solid fa-landmark' },
        { id: 10, subject:'Sports',  location: 'Colindale',  price: 60,  spaces: 5, icon: 'fa-solid fa-basketball' }
      ],

      // Cart items: { id (numeric or _id string), subject, location, price, qty }
      cart: [],

      // UI state
      showCart: false,
      sortBy: 'subject', // 'subject'|'location'|'price'|'spaces'
      sortDir: 'asc',    // 'asc'|'desc'
      searchQuery: '',

      // checkout inputs
      checkoutName: '',
      checkoutPhone: '',

      // flags/messages
      orderConfirmed: false,
      orderError: '',
      submittingOrder: false, // prevents duplicate POSTs

      // choose backend search approach 
      backendSearchEnabled: true,

      // small debounce timer id to avoid overwhelming server on very fast typing
      _searchDebounceId: null
    };
  },

  computed: {
    // Validation: letters + spaces only
    validName() {
      return /^[A-Za-z ]+$/.test(this.checkoutName.trim());
    },

    // Validation: digits only (at least 5 digits)
    validPhone() {
      return /^[0-9]{5,}$/.test(this.checkoutPhone.trim());
    },

    // Checkout enabled only when cart has items and name/phone valid and not currently submitting
    canCheckout() {
      return this.cart.length > 0 && this.validName && this.validPhone && !this.submittingOrder;
    },

    // Cart total in £
    cartTotal() {
      return this.cart.reduce((sum, it) => sum + (it.price * it.qty), 0);
    },

    // Sorted list shown in the lessons grid
    displayedLessons() {
      const arr = this.lessons.slice();
      const key = this.sortBy;
      const dir = this.sortDir === 'asc' ? 1 : -1;

      arr.sort((a, b) => {
        let va = a[key];
        let vb = b[key];

        // guard undefined
        if (va === undefined) va = '';
        if (vb === undefined) vb = '';

        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();

        if (va > vb) return 1 * dir;
        if (va < vb) return -1 * dir;
        return 0;
      });

      return arr;
    }
  },

  methods: {
    // reactive search-as-you-type (calls backend /search?q=...).
    // small debounce implemented (300ms) to reduce request rate.
    onSearchInput() {
      const q = this.searchQuery.trim();

      // debounce: clear previous timer
      if (this._searchDebounceId) clearTimeout(this._searchDebounceId);

      // schedule new request
      this._searchDebounceId = setTimeout(() => {
        if (!this.backendSearchEnabled) {
         
          return;
        }

        const url = q.length ? apiPath(`/search?q=${encodeURIComponent(q)}`) : apiPath('/lessons');

        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error(`Search request failed: ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (!Array.isArray(data)) {
              // Unexpected response - do not clear existing lessons
              console.warn('Search returned non-array; ignoring.');
              return;
            }

            // Map backend docs to frontend shape, prefer numeric `id` if present
            this.lessons = data.map(d => ({
              id: (d.hasOwnProperty('id') && !isNaN(Number(d.id))) ? Number(d.id) : (d._id ? d._id : null),
              subject: d.subject || d.topic || '',
              location: d.location || '',
              price: Number(d.price) || 0,
              spaces: Number(d.spaces) || 0,
              icon: d.icon || 'fa-solid fa-chalkboard'
            }));
          })
          .catch(err => {
            console.error('Search error:', err);
            // Keep current lessons (embedded or last-known) on error
          });
      }, 300); // 300ms debounce
    },

    // Add one space of a lesson to the cart
    addToCart(lesson) {
      if (!lesson || Number(lesson.spaces) <= 0) return;

      // Decrement displayed spaces immediately for UI feedback
      lesson.spaces = Number(lesson.spaces) - 1;

      // Add or increment cart item by lesson.id
      const inCart = this.cart.find(it => String(it.id) === String(lesson.id));
      if (inCart) {
        inCart.qty += 1;
      } else {
        this.cart.push({
          id: lesson.id,
          subject: lesson.subject,
          location: lesson.location,
          price: lesson.price,
          qty: 1
        });
      }
    },

    // Remove entire cartItem from cart and restore spaces in lessons front end
    removeFromCart(cartItem) {
      const lesson = this.lessons.find(l => String(l.id) === String(cartItem.id));
      if (lesson) {
        lesson.spaces = Number(lesson.spaces) + Number(cartItem.qty);
      }

      const idx = this.cart.indexOf(cartItem);
      if (idx > -1) this.cart.splice(idx, 1);
    },

    // Toggle between lessons page and cart page
    toggleCart() {
      this.showCart = !this.showCart;
      // reset messages when toggling back to lessons
      if (!this.showCart) {
        this.orderConfirmed = false;
        this.orderError = '';
      }
    },

    // Submit order (prevents duplicates by disabling while submitting)
    // Payload format:{ name, phone, lessonIDs, numberOfSpace }
    submitOrder() {
      // prevent duplicate submits
      if (this.submittingOrder) return;

      // client-side validation
      if (!this.validName || !this.validPhone) {
        this.orderError = 'Please enter a valid name and phone number.';
        return;
      }
      if (this.cart.length === 0) {
        this.orderError = 'Cart is empty.';
        return;
      }

      //Payload using ids exactly as stored in cart (numeric or _id string)
      const lessonIDs = this.cart.map(it => ({ lessonId: isNaN(Number(it.id)) ? it.id : Number(it.id), qty: Number(it.qty) }));
      const numberOfSpace = this.cart.reduce((s, it) => s + Number(it.qty), 0);

      const payload = {
        name: this.checkoutName.trim(),
        phone: this.checkoutPhone.trim(),
        lessonIDs,
        numberOfSpace
      };

      // mark submitting to prevent duplicates and disable checkout button
      this.submittingOrder = true;
      this.orderError = '';
      this.orderConfirmed = false;

      // POST order
      fetch(apiPath('/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if (!res.ok) {
            // try to read backend error payload
            return res.json().then(j => { throw new Error(j.error || `Order POST failed: ${res.status}`); });
          }
          return res.json();
        })
        .then(postResult => {
          // After order saved, update each lesson's spaces on the server using PUT /lessons/:id
        
          const putPromises = this.cart.map(cartItem => {
            const lesson = this.lessons.find(l => String(l.id) === String(cartItem.id));
            if (!lesson) return Promise.resolve();

            // Prepare update body - include current lesson.spaces
            const updateBody = {
              subject: lesson.subject,
              location: lesson.location,
              price: lesson.price,
              spaces: Number(lesson.spaces),
              icon: lesson.icon
            };

            // Build path using cartItem.id 
            const putUrl = apiPath(`/lessons/${encodeURIComponent(cartItem.id)}`);

            return fetch(putUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateBody)
            })
              .then(r => {
                if (!r.ok) {
                  return r.json().then(j => { throw new Error(j.error || `PUT failed for lesson ${cartItem.id}: ${r.status}`); });
                }
                return r.json();
              });
          });

          // wait for all PUTs
          return Promise.all(putPromises).then(() => postResult);
        })
        .then(() => {
          // All updates succeeded on server
          // Clear cart, reset checkout inputs, show confirmation
          this.cart = [];
          this.checkoutName = '';
          this.checkoutPhone = '';
          this.orderConfirmed = true;
          this.orderError = '';
        })
        .catch(err => {
          console.error('Order submission error:', err);
          this.orderError = err.message || 'Error submitting order';
        })
        .finally(() => {
          // after order flow completes  re-fetch lessons from backend
          // to ensure spaces reflect DB authoritative state (and persist across refresh).
          this.fetchLessonsFromBackend()
            .catch(e => {
              // ignore fetch errors here but log them
              console.error('Failed to re-fetch lessons after order:', e);
            })
            .finally(() => {
              // Re-enable submission only after we've attempted to sync with server
              this.submittingOrder = false;
            });
        });
    },

    // Fetch all lessons from backend and map to frontend shape.
    fetchLessonsFromBackend() {
      const url = apiPath('/lessons');
      return fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`GET /lessons returned ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (!Array.isArray(data)) throw new Error('GET /lessons returned non-array');
          // Map backend docs to frontend objects; prefer numeric id when present
          this.lessons = data.map(d => ({
            id: (d.hasOwnProperty('id') && !isNaN(Number(d.id))) ? Number(d.id) : (d._id ? d._id : null),
            subject: d.subject || d.topic || '',
            location: d.location || '',
            price: Number(d.price) || 0,
            spaces: Number(d.spaces) || 0,
            icon: d.icon || 'fa-solid fa-chalkboard'
          }));
        })
        .catch(err => {
          console.info('Backend lessons not reachable; keeping existing embedded/last-known lessons.', err && err.message ? err.message : err);
          // do not rethrow - caller may want to continue
        });
    }
  },

  mounted() {
    // On load, fetch authoritative lessons from backend.
    // If backend not reachable fallback on hardcoded lessons.
    this.fetchLessonsFromBackend();
  }
});
