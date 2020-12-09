! function (DATABASE_ID) {
    const products = {};
    const app = new Vue({
        el: '#app',
        data: {
            logged: false,
            user: {},
            products: [],
        },
        methods: {
            async create(event) {
                if (this.logged === false) return console.error('user is not logged in');
                disableAllButtons(event.target);
                let ref;
                let data = convertProductData(event.target.elements, this.user.uid);
                let progressContainer = document.createElement('div');
                let progressEl = document.createElement('div');
                let progress = new progressUi(data.images.length,
                    percent => progressEl.style.width = percent + '%',
                    () => progressContainer.remove());
                progressContainer.className = 'progress';
                progressEl.className = 'progress-bar bg-info';
                progressEl.setAttribute('role', 'progressbar');
                progressEl.style.width = '0';

                progressContainer.append(progressEl);
                event.target.prepend(progressContainer);

                for (let image of data.images) {
                    var imagePath = this.getStoragePath(image.name, 'products');
                    var imageRef = firebase.storage().ref().child(imagePath);

                    ref = await imageRef.put(image);
                    data.data.images.push(ref.metadata.fullPath);
                    progress.update();
                }
                progress.complete();

                let dbRef = firebase.firestore()
                    .collection('databases').doc(DATABASE_ID)
                    .collection('products').doc();

                await dbRef.set(data.data);
                event.target.reset();
                enableAllButtons();
            },
            signInWithGoogle(event) {
                disableAllButtons(event.target);
                var provider = new firebase.auth.GoogleAuthProvider;
                if (this.logged) firebase.auth().signOut();
                firebase.auth().signInWithRedirect(provider);
            },
            signInWithFacebook(event) {
                disableAllButtons(event.target);
                var provider = new firebase.auth.FacebookAuthProvider;
                firebase.auth().signInWithRedirect(provider);
            },
            signOut(event) {
                disableAllButtons(event.target);
                firebase.auth().signOut();
            },
            getStoragePath(name, path) {
                return `databases/${DATABASE_ID}/${path}/${Date.now()}-${name.slice(-20)}`;
            },
            deleteProduct(id) {
                if (products[id] && confirm(`Are you sure to delete a product #${id}?`)) {
                    products[id].delete().then(() => {
                        var i = this.products.findIndex(product => product.id == id);
                        if (i < 0) return console.log(i);
                        delete this.products[i];
                        this.products = this.products.filter(product => product != null);
                    });
                }
            },
            updateProduct(id) {}
        },
        computed: {
            randomProductPrice() {
                return Math.round(Math.random() * 100) * (Math.random() < 0.5 ? 2400 : 3200);
            },
            randomProductName() {
                var random_names = ['Chapstick', 'Post-lts', 'Band-Ait', 'Air Jordan', 'Microsfot Word', 'Magic Eraser', 'Doritos', 'Shapie', 'Frisbee', 'Pinterest', 'McNuggets', 'Nyquil', 'Kleenex', 'Froot Loops', 'HedBanz'];
                let i = Math.round(Math.random() * random_names.length);
                return random_names[i];
            },
        }
    });

    firebase.auth().onAuthStateChanged(user => {
        enableAllButtons();
        if (user) {
            app.logged = true;
            app.products = [];
            app.user = user.toJSON();

            firebase.firestore().collection('databases').doc(DATABASE_ID)
                .collection('products').get()
                .then(productsRef => productsRef.forEach(productRef => {
                    let id = productRef.id;
                    let data = productRef.data();
                    let product = {
                        id,
                        photoUrl: [],
                        ...data
                    };

                    products[id] = productRef.ref;

                    app.products.push(product);
                    data.images.filter(image => image && image.length > 1)
                        .map(image => firebase.storage()
                            .ref().child(image)
                            .getDownloadURL()
                            .then(url => {
                                product.photoUrl.push(url);
                            }));
                }))
                .then(() => console.log(app.products));
        } else {
            app.logged = false;
            app.user = {};
            app.products = [];
        }
    });

    function convertProductData({
        product_name,
        product_price,
        product_description,
        product_photos
    }, uid) {
        let images = [],
            data = {
                uid
            };

        data.name = String(product_name.value);
        data.price = Number(product_price.value);
        data.description = product_description.value || null;
        data.images = [];
        data.createdAt = Number(Date.now());

        for (let photo of product_photos.files) {
            images.push(photo);
        }

        return {
            data,
            images
        };
    }

    function progressUi(total, callback, resolve) {
        this.load = 0;
        this.total = total;
        this.onUpdated = callback;
        this.onCompleted = resolve;

        this.__defineGetter__('percent', () => {
            return (Number(this.load) / Number(this.total)) * 100;
        });
    }

    progressUi.prototype.update = function () {
        this.load++;
        this.onUpdated.call(this, this.percent);
    };

    progressUi.prototype.complete = function () {
        this.load = this.total;
        this.onCompleted.call(this);
    };

    let disabledButtons = [];

    function disableAllButtons(el) {
        let disable = (btn) => {
            btn.setAttribute('disabled', true);
            disabledButtons.push(btn);
        };
        document.querySelectorAll('a').forEach(btn => disable(btn));
        document.querySelectorAll('button').forEach(btn => disable(btn));
    }

    function enableAllButtons() {
        while (disabledButtons.length) {
            disabledButtons.pop().removeAttribute('disabled');
        }
    }
}('ctkesqmPHGJHW95gMvnL');
