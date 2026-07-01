function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

const searchBar = document.getElementById('searchBar');
const suggestionsBox = document.getElementById('searchSuggestions');

if (searchBar && suggestionsBox) {
    searchBar.addEventListener('input', debounce(async (e) => {
        const searchQuery = e.target.value.trim();
        
        // Eğer arama çubuğu boşsa kutuyu gizle ve çık
        if (searchQuery.length < 1) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'none';
            return;
        }

        const brand = document.getElementById('filterBrand')?.value || 'all';
        const maxPrice = document.getElementById('filterMaxPrice')?.value || '';
        const feature = document.getElementById('filterFeature')?.value || 'all';
        const sort = document.getElementById('filterSort')?.value || 'default';

        // Kutuda fazla kalabalık olmasın diye backend'e limit=5 parametresi ekliyoruz
        let url = `/api/search?q=${encodeURIComponent(searchQuery)}&brand=${brand}&maxPrice=${maxPrice}&feature=${feature}&sort=${sort}&limit=5`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.watches.length > 0) {
                renderSuggestions(data.watches);
            } else {
                suggestionsBox.innerHTML = '<div style="padding:10px; color:#888; font-size:0.8rem;">Sonuç bulunamadı...</div>';
                suggestionsBox.style.display = 'block';
            }
        } catch (error) {
            console.error("Öneri getirme hatası:", error);
        }
    }, 200)); // Hızlı tepki vermesi için süreyi 200ms'ye çektik
}

// Minik kutunun içine 5 sonucu yerleştiren fonksiyon
function renderSuggestions(watches) {
    suggestionsBox.innerHTML = '';
    
    watches.forEach(watch => {
// main.js içindeki render fonksiyonunun içi
    const imageSrc = `/proxy-watch-image?watchId=${watch.watchId}&imageName=${watch.watchImageName}`;        const brandTitle = watch.makeName || watch.brand || 'Brand';
        const modelName = watch.modelName || watch.name || '';
        const watchId = watch._id; // Tıklayınca detay sayfasına gitmesi için

        // Buradaki href linkini kendi detay sayfa yapına göre düzenle (Örn: /watches/${watchId} veya /product/${watchId})
        suggestionsBox.innerHTML += `
            <a href="/watches/${watchId}" class="suggestion-item">
                <img src="${imageSrc}" alt="watch">
                <div class="info">
                    <strong>${brandTitle}</strong>
                    <span class="model">${modelName.substring(0, 45)}...</span>
                </div>
            </a>
        `;
    });

    suggestionsBox.style.display = 'block';
}

// Kullanıcı boş bir yere tıkladığında minik kutu kapansın
document.addEventListener('click', function(e) {
    if (searchBar && suggestionsBox && !searchBar.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = 'none';
    }
});

// Arama kutusuna tekrar tıklandığında içinde veri varsa kutu yeniden açılsın
if(searchBar) {
    searchBar.addEventListener('focus', () => {
        if (searchBar.value.trim().length > 0 && suggestionsBox.innerHTML !== '') {
            suggestionsBox.style.display = 'block';
        }
    });
}

// Temizleme fonksiyonunu da güncelleyelim
window.clearSearch = function() {
    if (searchBar && suggestionsBox) {
        searchBar.value = '';
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
    }
};

// ==========================================
// 2. SEPET VE MODAL İŞLEMLERİ
// ==========================================
const cartBtn = document.getElementById('cart');
const cartOverlay = document.getElementById('cartOverlay');
const cartDrawer = document.getElementById('cartDrawer');
const closeCartBtn = document.getElementById('closeCartBtn');
const continueShoppingBtn = document.getElementById('continueShoppingBtn');
const cartEmpty = document.getElementById('cartEmpty');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartFooter = document.getElementById('cartFooter');
const cartCountHeader = document.getElementById('cartCountHeader');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const clearCartBtn = document.getElementById('clearCartBtn');

let cartItems = JSON.parse(localStorage.getItem('alone_cart')) || [];

function saveCart() {
    localStorage.setItem('alone_cart', JSON.stringify(cartItems));
}

function toggleCart() {
    if(cartOverlay && cartDrawer) {
        cartOverlay.classList.toggle('active');
        cartDrawer.classList.toggle('active');
    }
}

if(cartBtn) cartBtn.addEventListener('click', toggleCart);
if(closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
if(cartOverlay) cartOverlay.addEventListener('click', toggleCart);
if(continueShoppingBtn) continueShoppingBtn.addEventListener('click', toggleCart);

window.addToCart = function(item) {
    const existingItem = cartItems.find(i => i.id === item.id && i.variant === item.variant);
    
    if (existingItem) {
        existingItem.qty += item.qty;
        if (existingItem.qty > item.maxStock) existingItem.qty = item.maxStock;
    } else {
        cartItems.push(item);
    }
    
    saveCart();
    renderCart();
    
    if(cartOverlay && cartDrawer) {
        cartOverlay.classList.add('active');
        cartDrawer.classList.add('active');
    }
};

function renderCart() {
    if(!cartCountHeader) return;
    cartCountHeader.innerText = `(${cartItems.length} Items)`;
    
    if (cartItems.length === 0) {
        if(cartEmpty) cartEmpty.style.display = 'flex';
        if(cartItemsContainer) cartItemsContainer.style.display = 'none';
        if(cartFooter) cartFooter.style.display = 'none';
    } else {
        if(cartEmpty) cartEmpty.style.display = 'none';
        if(cartItemsContainer) cartItemsContainer.style.display = 'block';
        if(cartFooter) cartFooter.style.display = 'block';
        
        if(cartItemsContainer) {
            cartItemsContainer.innerHTML = '';
            let total = 0;
            
            cartItems.forEach((item, index) => {
                total += item.price * item.qty;
                cartItemsContainer.innerHTML += `
                    <div class="cart-item">
                        <div class="cart-item-top">
                            <div class="cart-item-title">${item.name}</div>
                            <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
                        </div>
                        <div class="cart-item-variant">${item.variant}</div>
                        <div class="cart-item-controls">
                            <div class="qty-control">
                                <button class="qty-btn" onclick="updateQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                                <div class="qty-val">${item.qty}</div>
                                <button class="qty-btn" onclick="updateQty(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
                            </div>
                            <button class="remove-btn" onclick="removeItem(${index})"><i class="fa-regular fa-trash-can"></i> Remove</button>
                        </div>
                    </div>
                `;
            });
            if(cartTotalPrice) cartTotalPrice.innerText = `$${total.toFixed(2)}`;
        }
    }
}

window.updateQty = function(index, change) {
    const item = cartItems[index];
    if(!item) return;
    const newQty = item.qty + change;

    if (newQty > 0) {
        if (newQty <= item.maxStock) {
            item.qty = newQty;
        }
    } else {
        cartItems.splice(index, 1);
    }
    
    saveCart();
    renderCart();
};

window.removeItem = function(index) {
    cartItems.splice(index, 1);
    saveCart();
    renderCart();
};

if(clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
        cartItems = [];
        saveCart();
        renderCart();
    });
}

renderCart();

const checkoutBtn = document.querySelector('.checkout-btn');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cartItems.length === 0) return alert("Your cart is empty!");
        
        const itemsToCheckout = cartItems.map(item => ({
            id: item.id,
            title: item.variant,
            qty: item.qty
        }));

        const cartData = encodeURIComponent(JSON.stringify(itemsToCheckout));
        window.location.href = `/checkout?cart=${cartData}`; 
    });
}