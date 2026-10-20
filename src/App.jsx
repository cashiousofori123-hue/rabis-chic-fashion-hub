import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Fingerprint, LogOut, ShieldCheck, Menu, X, Heart, ShoppingBag, Search as SearchIcon, UserRound, ChevronDown, HelpCircle } from 'lucide-react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import api from './api';
import { useAuth } from './context/AuthContext';
import { telLink, whatsappLink } from './utils/contactLinks';
import Onupa from './components/Onupa';
import WhatsAppButton from './components/WhatsAppButton';
const SearchPage = lazy(() => import('./pages/Search'));
const WishlistPage = lazy(() => import('./pages/Wishlist'));
const FAQPage = lazy(() => import('./pages/FAQ'));
const AccountPage = lazy(() => import('./pages/Account'));
const TrackOrder      = lazy(() => import('./components/TrackOrder'));
const Overview        = lazy(() => import('./pages/admin/Overview'));
const Products        = lazy(() => import('./pages/admin/Products'));
const Orders          = lazy(() => import('./pages/admin/Orders'));
const PendingUsers    = lazy(() => import('./pages/admin/PendingUsers'));
const ContentManager  = lazy(() => import('./pages/admin/ContentManager'));
const ProfilePage     = lazy(() => import('./pages/admin/Profile'));
const SettingsPage    = lazy(() => import('./pages/admin/Settings'));
const MessagesPage    = lazy(() => import('./pages/admin/Messages'));
const AdminLogin      = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayoutComp = lazy(() => import('./pages/admin/AdminLayout'));


// Production Initial Catalog
const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Chic Floral Summer Mini Dress",
    category: "Dresses",
    price: 180,
    stock: 12,
    rating: 4.8,
    mainImage: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80",
    description: "Breathable, high-quality chiffon floral dress designed for everyday elegance on UCC campus."
  },
  {
    id: 2,
    name: "Satin Evening Elegance Gown",
    category: "Dresses",
    price: 290,
    stock: 5,
    rating: 4.9,
    mainImage: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80",
    description: "Premium silk satin gown ideal for awards nights, formal dinners, and special hall events."
  },
  {
    id: 3,
    name: "Luxury Designer Gold Clasp Tote",
    category: "Bags",
    price: 220,
    stock: 8,
    rating: 4.7,
    mainImage: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80",
    description: "Spacious faux leather tote bag with gold-tone hardware. Perfect for lectures and laptops."
  },
  {
    id: 4,
    name: "Strappy Stiletto Party Heels",
    category: "Footwear",
    price: 210,
    stock: 10,
    rating: 4.6,
    mainImage: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80",
    description: "Sleek and comfortable 4-inch strap heels to complete your stylish outfits."
  }
];

const ALL_CATEGORIES = [
  "All",
  "Dresses",
  "Bags",
  "Footwear",
  "Lip balm",
  "Face mask",
  "Eye mask",
  "Lip mask",
  "Clay mask",
  "Headbands",
  "Slippers",
  "Sandals",
  "Down shoe",
  "Scrunchies",
  "Official dresses"
];

const effectivePrice = (product) => Math.round(Number(product?.price || 0) * (100 - Number(product?.discount || 0)) / 100 * 100) / 100;

const optimizeProductImage = (imageUrl) => {
  try {
    const url = new URL(imageUrl);
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('w', '400');
      url.searchParams.set('h', '500');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('q', '70');
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fm', 'webp');
    }
    return url.toString();
  } catch {
    return imageUrl;
  }
};

export default function App() {
  const { user, role, authReady, adminUnlocked, login, logout, unlockAdmin, lockAdmin } = useAuth();
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  useEffect(() => {
    const syncPath = () => setRoutePath(window.location.pathname);
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);
  useEffect(() => {
    if (routePath.startsWith('/admin') && routePath !== '/admin-secret-login-rabis2024' && authReady && !user) {
      window.history.replaceState({}, '', '/login');
      setRoutePath('/login');
    }
  }, [routePath, authReady, user, role]);

  const [activeView, setActiveView] = useState('store'); // 'store', 'tracker', 'lookup', 'about', 'contact', 'admin'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [adminTab, setAdminTab] = useState('overview'); // 'overview', 'approvals', 'messages', 'catalog', 'contact', 'security'
  const isAdminAccount = authReady && role === 'admin';
  const isAdminAuthenticated = isAdminAccount && adminUnlocked;
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [loginRestricted, setLoginRestricted] = useState(false);
  const [adminPasskeys, setAdminPasskeys] = useState([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [riders, setRiders] = useState([]);
  const [transferEmail, setTransferEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);

  // Products State
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('rabi_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; }
  });

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Dresses');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImages, setNewProdImages] = useState([]);

  // Admin Profile State
  const [adminProfile, setAdminProfile] = useState(() => {
    const saved = localStorage.getItem('rabi_admin_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Rabi',
      title: 'Store Owner & Fashion Designer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bio: "Passionate about bringing affordable, chic, and high-quality fashion trends directly to students across University of Cape Coast campus."
    };
  });

  // Admin Contact Information State
  const [adminContact, setAdminContact] = useState(() => {
    return {
      phone: '',
      whatsapp: '',
      email: 'contact@rabischic.com',
      location: 'University of Cape Coast (UCC), Cape Coast, Ghana'
    };
  });

  // Hero Banner Slideshow
  const [slides, setSlides] = useState(() => {
    const saved = localStorage.getItem('rabi_slides');
    return saved ? JSON.parse(saved) : [
      { id: 1, url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80', title: 'New UCC Campus Arrival' },
      { id: 2, url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80', title: "Rabi's Exclusive Chic Collection" }
    ];
  });
  const [siteContent, setSiteContent] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = window.setInterval(() => setCurrentSlideIndex(index => (index + 1) % slides.length), 4000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  // Orders & Messages State
  const [orders, setOrders] = useState(() => {
    return [];
  });
  const [adminOrderAlert, setAdminOrderAlert] = useState(null);
  const seenOrderIds = useRef(null);
  const [adminMessageAlert, setAdminMessageAlert] = useState(null);
  const seenMessageIds = useRef(null);

  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(null);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('rabi_messages');
    return saved ? JSON.parse(saved) : [];
  });

  // Customer Order Lookup State
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  // Contact Form State
  const [contactMsg, setContactMsg] = useState({ name: '', phone: '', note: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Checkout Form State
  const [checkoutData, setCheckoutData] = useState({
    name: '',
    phone: '',
    email: '',
    hostel: 'Casely Hayford Hall',
    roomNumber: '',
    selectedProductId: 1,
    customItemName: '',
    quantity: 1,
    deliveryOption: 'ucc',
    paymentMethod: 'MTN MoMo',
    couponCode: ''
  });

  const [orderStage, setOrderStage] = useState('idle');
  const [showCallModal, setShowCallModal] = useState(false);

  // Security Settings State

  // Local Storage Sync
  useEffect(() => {
    const cacheSafeProducts = products.map(product => ({
      ...product,
      mainImage: String(product.mainImage || '').startsWith('data:') ? '' : product.mainImage,
      images: (product.images || []).filter(image => !String(image).startsWith('data:')),
    }));
    try { localStorage.setItem('rabi_products', JSON.stringify(cacheSafeProducts)); } catch { /* API data is fetched again on reload. */ }
  }, [products]);

  useEffect(() => {
    try { localStorage.setItem('wishlist', JSON.stringify(wishlist)); } catch { /* The wishlist is small and can be rebuilt. */ }
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('rabi_slides', JSON.stringify(slides));
  }, [slides]);

  useEffect(() => {
    localStorage.setItem('rabi_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('rabi_admin_profile', JSON.stringify(adminProfile));
  }, [adminProfile]);

  const currentOrderProduct = products.find(p => p.id === Number(checkoutData.selectedProductId)) || products[0];
  const orderSubtotal = effectivePrice(currentOrderProduct) * checkoutData.quantity;
  const orderDiscount = checkoutData.couponCode.trim().toUpperCase() === 'CHIC10' ? Math.round(orderSubtotal * 0.1 * 100) / 100 : 0;
  const deliveryFees = { ucc: 0, accra: 30, outside: 50 };
  const orderDeliveryFee = deliveryFees[checkoutData.deliveryOption];
  const orderTotal = orderSubtotal - orderDiscount + orderDeliveryFee;

  useEffect(() => {
    api.get('/store-contact')
      .then(({ data }) => setAdminContact(data))
      .catch(() => {});
    const refreshContact = () => api.get('/store-contact')
      .then(({ data }) => setAdminContact(data))
      .catch(() => {});
    const syncContact = (event) => { if (event.key === 'rabis_contact_updated_at') refreshContact(); };
    window.addEventListener('rabis:contact-updated', refreshContact);
    window.addEventListener('storage', syncContact);
    return () => {
      window.removeEventListener('rabis:contact-updated', refreshContact);
      window.removeEventListener('storage', syncContact);
    };
  }, []);

  useEffect(() => {
    const refreshProducts = () => api.get('/products').then(({ data }) => setProducts(data)).catch(() => {});
    const syncProducts = (event) => { if (event.key === 'rabis_content_updated_at') refreshProducts(); };
    refreshProducts();
    window.addEventListener('rabis:content-updated', refreshProducts);
    window.addEventListener('storage', syncProducts);
    return () => {
      window.removeEventListener('rabis:content-updated', refreshProducts);
      window.removeEventListener('storage', syncProducts);
    };
  }, []);

  useEffect(() => {
    api.get('/store-profile')
      .then(({ data }) => setAdminProfile(data))
      .catch(() => {});
    const refreshProfile = () => api.get('/store-profile')
      .then(({ data }) => setAdminProfile(data))
      .catch(() => {});
    const syncProfile = (event) => { if (event.key === 'rabis_profile_updated_at') refreshProfile(); };
    window.addEventListener('rabis:profile-updated', refreshProfile);
    window.addEventListener('storage', syncProfile);
    return () => {
      window.removeEventListener('rabis:profile-updated', refreshProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, []);

  useEffect(() => {
    const refreshContent = () => api.get('/site-content/homepage').then(({ data }) => {
      setSiteContent(data);
      const managedSlides = Array.isArray(data?.heroSlides) ? data.heroSlides : [];
      if (managedSlides.length) setSlides(managedSlides.map((slide, index) => ({ id: slide.id || `slide-${index}`, url: slide.imageUrl, title: slide.title, subtitle: slide.subtitle, badge: slide.badge, buttonText: slide.buttonText, buttonLink: slide.buttonLink })));
      else {
      const banners = data?.featured?.bannerImages || [];
      if (banners.length) setSlides(banners.map((url, index) => ({ id: `content-${index}`, url, title: data.hero?.title || 'Rabiâ€™s Chic Collection' })));
      else if (data?.hero?.imageUrl) setSlides([{ id: 'hero', url: data.hero.imageUrl, title: data.hero.title || 'Rabiâ€™s Chic Collection' }]);
      }
    }).catch(() => {});
    const syncContent = (event) => { if (event.key === 'rabis_content_updated_at') refreshContent(); };
    refreshContent();
    window.addEventListener('rabis:content-updated', refreshContent);
    window.addEventListener('storage', syncContent);
    return () => {
      window.removeEventListener('rabis:content-updated', refreshContent);
      window.removeEventListener('storage', syncContent);
    };
  }, []);

  useEffect(() => {
    if (!isAdminAuthenticated && role !== 'rider') return;
    let active = true;
    const refreshOrders = async () => {
      try {
        const { data } = await api.get('/orders');
        if (!active) return;
        setOrders(data);
        const latestIds = new Set(data.map(order => order.id));
        if (seenOrderIds.current === null) {
          seenOrderIds.current = latestIds;
          return;
        }
        const newOrders = data.filter(order => !seenOrderIds.current.has(order.id));
        latestIds.forEach(id => seenOrderIds.current.add(id));
        if (newOrders.length) {
          const newest = newOrders[0];
          setAdminOrderAlert(newest);
          if (localStorage.getItem('rabi_order_alerts_enabled') === 'true') {
            try {
              const AudioContextClass = window.AudioContext || window.webkitAudioContext;
              if (AudioContextClass) {
                const audio = new AudioContextClass();
                const oscillator = audio.createOscillator();
                const gain = audio.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audio.currentTime);
                oscillator.frequency.setValueAtTime(1175, audio.currentTime + 0.16);
                gain.gain.setValueAtTime(0.001, audio.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.16, audio.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.42);
                oscillator.connect(gain);
                gain.connect(audio.destination);
                oscillator.start();
                oscillator.stop(audio.currentTime + 0.43);
                window.setTimeout(() => audio.close().catch(() => {}), 600);
              }
            } catch { /* Browser sound may be muted or unavailable. */ }
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Rabiâ€™s Chic order', {
                body: `${newest.customer} ordered ${newest.items}. Total GHâ‚µ ${newest.amount}.`,
                tag: newest.id,
              });
            }
          }
        }
      } catch { /* Keep the last known orders during temporary network failures. */ }
    };
    refreshOrders();
    const timer = window.setInterval(refreshOrders, 8000);
    let messagesTimer;
    if (isAdminAuthenticated) {
      api.get('/users/pending').then(({ data }) => setPendingUsers(data)).catch(() => setPendingUsers([]));
      api.get('/users/riders').then(({ data }) => setRiders(data)).catch(() => setRiders([]));
      const refreshMessages = () => api.get('/contact-messages').then(({ data }) => {
        setMessages(data);
        const latestIds = new Set(data.map(message => message.id));
        if (seenMessageIds.current === null) {
          seenMessageIds.current = latestIds;
          return;
        }
        const newMessages = data.filter(message => !seenMessageIds.current.has(message.id));
        latestIds.forEach(id => seenMessageIds.current.add(id));
        if (newMessages.length) {
          const newest = newMessages[0];
          setAdminMessageAlert(newest);
          if (localStorage.getItem('rabi_order_alerts_enabled') === 'true') {
            try {
              const AudioContextClass = window.AudioContext || window.webkitAudioContext;
              if (AudioContextClass) {
                const audio = new AudioContextClass();
                const oscillator = audio.createOscillator();
                const gain = audio.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audio.currentTime);
                oscillator.frequency.setValueAtTime(1175, audio.currentTime + 0.16);
                gain.gain.setValueAtTime(0.001, audio.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.16, audio.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.42);
                oscillator.connect(gain);
                gain.connect(audio.destination);
                oscillator.start();
                oscillator.stop(audio.currentTime + 0.43);
                window.setTimeout(() => audio.close().catch(() => {}), 600);
              }
            } catch { /* Sound may be muted or unavailable. */ }
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New customer message', { body: `${newest.sender}: ${newest.text}`, tag: newest.id });
            }
          }
        }
      }).catch(() => {});
      refreshMessages();
      messagesTimer = window.setInterval(refreshMessages, 12000);
    }
    return () => { active = false; window.clearInterval(timer); if (messagesTimer) window.clearInterval(messagesTimer); };
  }, [isAdminAuthenticated, role]);

  useEffect(() => {
    if (!isAdminAccount || activeView !== 'admin' || (adminUnlocked && adminTab !== 'security')) return;
    api.get('/auth/admin/passkeys/status', { useRegularAuth: true })
      .then(({ data }) => setAdminPasskeys(data.passkeys || []))
      .catch(() => setAdminPasskeys([]));
  }, [activeView, adminTab, adminUnlocked, isAdminAccount]);

  useEffect(() => {
    if (!adminUnlocked) return undefined;
    let timeoutId;
    const expireUnlock = () => {
      const expiresAt = Number(localStorage.getItem('rabi_admin_unlocked_until') || 0);
      if (expiresAt > Date.now()) {
        timeoutId = window.setTimeout(expireUnlock, expiresAt - Date.now());
        return;
      }
      lockAdmin();
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin-secret-login-rabis2024') {
        window.history.replaceState({}, '', '/rabis-admin');
        setRoutePath('/rabis-admin');
      }
      setPasskeyMessage('Admin access expired. Sign in again to continue.');
    };
    const scheduleExpiry = () => {
      window.clearTimeout(timeoutId);
      const expiresAt = Number(localStorage.getItem('rabi_admin_unlocked_until') || 0);
      timeoutId = window.setTimeout(expireUnlock, Math.max(0, expiresAt - Date.now()));
    };
    const syncAcrossTabs = (event) => {
      if (event.key === 'rabi_admin_unlocked_until' || event.key === 'rabi_admin_access_token') scheduleExpiry();
    };
    scheduleExpiry();
    window.addEventListener('storage', syncAcrossTabs);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('storage', syncAcrossTabs);
    };
  }, [adminUnlocked]);

  const validateGhanaPhone = (phoneNum) => {
    const cleaned = phoneNum.replace(/[\s-]/g, '');
    const ghanaRegex = /^(?:\+233|233|0)[23579]\d{8}$/;
    return ghanaRegex.test(cleaned);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const match = searchResults[0];
      if (match) {
        setSelectedProductModal(match);
        setSearchFocused(false);
      }
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!checkoutData.roomNumber || !checkoutData.name || !checkoutData.phone) {
      alert("Please fill in your name, phone number, and specific room number.");
      return;
    }

    if (!validateGhanaPhone(checkoutData.phone)) {
      alert("Invalid Ghana phone number! Please enter a valid number starting with 0 or +233 (e.g. 0241234567).");
      return;
    }

    const itemName = checkoutData.customItemName ? checkoutData.customItemName : currentOrderProduct.name;
    try {
      const { data: newOrder } = await api.post('/orders', {
      customer: checkoutData.name,
      phone: checkoutData.phone,
      email: checkoutData.email,
      hostel: checkoutData.hostel,
      room: checkoutData.roomNumber,
      items: itemName,
      productId: Number(checkoutData.selectedProductId),
      quantity: checkoutData.quantity,
      deliveryOption: checkoutData.deliveryOption,
      paymentMethod: checkoutData.paymentMethod,
      couponCode: checkoutData.couponCode,
      });
      setOrders([newOrder, ...orders]);
      setSelectedOrderForTracking(newOrder);
      setOrderStage('submitted');
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not submit order. Please try again.');
    }
  };

  const handleAdminApproveOrder = async (orderId) => {
    try {
      const { data: approvedOrder } = await api.post(`/orders/${orderId}/approve`);
      setOrders(orders.map(order => order.id === orderId ? approvedOrder : order));
      setSelectedOrderForTracking(approvedOrder);
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not approve order.');
    }
  };

  const handleLookupOrder = async (e) => {
    e.preventDefault();
    const [orderId, phone] = lookupQuery.trim().split(/\s+/);
    try {
      const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`, { params: { phone: phone || '' } });
      setLookupResult(data);
    } catch {
      setLookupResult('not_found');
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactMsg.name || !contactMsg.phone || !contactMsg.note) {
      alert("Please complete all contact fields.");
      return;
    }
    try {
      const { data: newMsg } = await api.post('/contact-messages', {
        sender: contactMsg.name,
        phone: contactMsg.phone,
        text: contactMsg.note,
      });
      setMessages(current => [newMsg, ...current.filter(message => message.id !== newMsg.id)]);
      setContactSubmitted(true);
      setContactMsg({ name: '', phone: '', note: '' });
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not send your message. Please try again.');
    }
  };

  const handlePriceChange = (id, newPrice) => {
    const price = Number(newPrice);
    setProducts(products.map(p => p.id === id ? { ...p, price } : p));
  };

  const persistPrice = async (id, price) => {
    try {
      await api.put(`/products/${id}`, { price: Number(price) });
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not save product price.');
    }
  };

  const reloadPendingUsers = async () => {
    const { data } = await api.get('/users/pending');
    setPendingUsers(data);
  };

  const updatePendingUser = async (userId, action) => {
    try {
      await api.post(`/users/${userId}/${action}`);
      await reloadPendingUsers();
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not update account.');
    }
  };

  const assignRider = async (orderId, riderId) => {
    if (!riderId) return;
    try {
      const { data } = await api.post(`/orders/${orderId}/assign-rider`, { rider_id: riderId });
      setOrders(current => current.map(order => order.id === orderId ? data : order));
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not assign courier.');
    }
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage('Choose an image file.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let image = canvas.toDataURL('image/webp', 0.78);
      if (image.length > 900_000) image = canvas.toDataURL('image/jpeg', 0.62);
      setAdminProfile(current => ({ ...current, avatar: image }));
      setProfileMessage('Photo selected. Save the profile to publish it.');
    } catch {
      setProfileMessage('Could not read that image. Try a JPEG, PNG, or WebP file.');
    } finally {
      event.target.value = '';
    }
  };

  const saveAdminProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const { data } = await api.put('/store-profile', adminProfile);
      setAdminProfile(data);
      localStorage.setItem('rabi_admin_profile', JSON.stringify(data));
      setProfileMessage('Profile saved and published to the About page.');
    } catch (error) {
      setProfileMessage(error.response?.data?.detail || 'Could not save the profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const transferAdmin = async (event) => {
    event.preventDefault();
    try {
      await api.post('/users/transfer-admin', { new_admin_email: transferEmail });
      logout();
      setActiveView('store');
      alert(`Admin access transferred to ${transferEmail}. You are now logged out.`);
    } catch (error) {
      alert(error.response?.data?.detail || 'Could not transfer admin access.');
    }
  };

  const registerAdminPasskey = async () => {
    setPasskeyBusy(true);
    setPasskeyMessage('');
    try {
      const { data: ceremony } = await api.post('/auth/admin/passkeys/registration/options');
      const credential = await startRegistration({ optionsJSON: ceremony.options });
      const { data } = await api.post('/auth/admin/passkeys/registration/verify', {
        challenge_token: ceremony.challenge_token,
        credential,
        label: 'This device',
      });
      setAdminPasskeys(data.passkeys || []);
      setPasskeyMessage('Device passkey is ready. You can use Face ID, fingerprint, or your device PIN to unlock.');
    } catch (error) {
      setPasskeyMessage(error.response?.data?.detail || error.message || 'Passkey setup did not complete.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  const unlockAdminWithPasskey = async () => {
    setPasskeyBusy(true);
    setPasskeyMessage('');
    try {
      const { data: ceremony } = await api.post('/auth/admin/passkeys/authentication/options', {}, { useRegularAuth: true });
      const credential = await startAuthentication({ optionsJSON: ceremony.options });
      const { data } = await api.post('/auth/admin/passkeys/authentication/verify', {
        challenge_token: ceremony.challenge_token,
        credential,
      }, { useRegularAuth: true });
      unlockAdmin(data.admin_access_token);
      setPasskeyMessage('Admin dashboard unlocked.');
    } catch (error) {
      setPasskeyMessage(error.response?.data?.detail || error.message || 'Device verification was not completed.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  const unlockAdminWithPassword = async (event) => {
    event.preventDefault();
    setPasskeyBusy(true);
    setPasskeyMessage('');
    try {
      const { data } = await api.post('/auth/admin/unlock/password', { password: unlockPassword }, { useRegularAuth: true });
      unlockAdmin(data.admin_access_token);
      setUnlockPassword('');
      setPasskeyMessage('Admin dashboard unlocked.');
    } catch (error) {
      setPasskeyMessage(error.response?.data?.detail || 'Password did not match.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleAddNewProductSubmit = (e) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) {
      alert("Please provide at least a product name and price.");
      return;
    }

    const newProductItem = {
      id: Date.now(),
      name: newProdName,
      category: newProdCat,
      price: Number(newProdPrice),
      stock: 15,
      rating: 5.0,
      mainImage: newProdImages.length > 0 ? newProdImages[0] : "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
      images: newProdImages,
      description: newProdDesc || "New arrival item added by Rabi."
    };

    api.post('/products', newProductItem)
      .then(({ data }) => setProducts(current => [data, ...current]))
      .catch(error => alert(error.response?.data?.detail || 'Could not add product.'));
    setNewProdName('');
    setNewProdPrice('');
    setNewProdDesc('');
    setNewProdImages([]);
    alert("New catalog item uploaded successfully!");
  };

  const handleMultiImageUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setNewProdImages(prev => [...prev, evt.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = !normalizedQuery || [p.name, p.description, p.category]
      .some(value => value?.toLowerCase().includes(normalizedQuery));
    return matchesCategory && matchesSearch;
  });
  const searchResults = searchQuery.trim()
    ? products.filter(product => [product.name, product.description, product.category]
      .some(value => value?.toLowerCase().includes(searchQuery.trim().toLowerCase())))
    : [];

  const requestedTrackingId = new URLSearchParams(window.location.search).get('order');
  const activeTrackingOrder = orders.find(order => String(order.id) === String(requestedTrackingId)) || selectedOrderForTracking || orders[0];
  const publicHero = siteContent?.hero || {};
  const adminPhoneHref = telLink(adminContact.phone);
  const adminWhatsAppHref = whatsappLink(adminContact.whatsapp);
  const adminWhatsAppMessageHref = whatsappLink(adminContact.whatsapp, 'Hello Rabi, I need clarification on my UCC hostel order.');
  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setRoutePath(path);
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
    setCartOpen(false);
  };
  const toggleWishlist = (productId) => setWishlist(current => current.some(id => String(id) === String(productId))
    ? current.filter(id => String(id) !== String(productId))
    : [...current, productId]);
  const choosePublicProduct = (product) => { setSelectedProductModal(product); navigateTo('/'); };

  useEffect(() => {
    if (routePath === '/register') {
      window.history.replaceState({}, '', '/signup');
      setRoutePath('/signup');
      return;
    }
    if (routePath === '/' || routePath === '/shop') setActiveView('store');
    else if (routePath === '/track') setActiveView(activeTrackingOrder ? 'tracker' : 'lookup');
    else if (routePath === '/orders') setActiveView('lookup');
    else if (routePath === '/about') setActiveView('about');
    else if (routePath === '/contact') setActiveView('contact');
  }, [routePath, Boolean(activeTrackingOrder)]);

  if (routePath === '/rabis-admin' || routePath === '/admin-secret-login-rabis2024') {
    return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AdminLogin onSuccess={() => { window.history.pushState({}, '', '/admin'); setRoutePath('/admin'); }} />
    </Suspense>;
  }

  if (routePath.startsWith('/admin')) {
    if (!authReady) return <div className="min-h-screen bg-rose-50/40" />;
    if (!user) return <Suspense fallback={<div className="min-h-screen bg-white" />}><AccountPage mode="login" onBack={() => navigateTo('/')} onNavigate={navigateTo} /></Suspense>;
    if (role !== 'admin') return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-700"><ShieldCheck size={26} /></div><h1 className="mt-4 text-xl font-bold text-slate-900">Restricted to Admin Only</h1><p className="mt-2 text-sm text-slate-500">This area is available to the store owner.</p><div className="mt-6 flex justify-center gap-2"><button onClick={() => navigateTo('/shop')} className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-bold text-white">Go to Store</button><button onClick={() => navigateTo('/')} className="min-h-11 rounded-full border border-slate-300 px-5 text-sm font-bold">Go Home</button></div></section></main>;
    if (!adminUnlocked) return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AdminLogin onSuccess={() => { window.history.pushState({}, '', '/admin'); setRoutePath('/admin'); }} />
    </Suspense>;
    const pages = {
      '/admin/overview': <Overview />,
      '/admin/products': <Products />,
      '/admin/orders': <Orders />,
      '/admin/users': <PendingUsers />,
      '/admin/content': <ContentManager />,
      '/admin/profile': <ProfilePage />,
      '/admin/messages': <MessagesPage />,
      '/admin/settings': <SettingsPage adminContact={adminContact} setAdminContact={setAdminContact} transferEmail={transferEmail} setTransferEmail={setTransferEmail} />,
    };
    return <>
      {adminOrderAlert && <div role="status" className="fixed right-4 top-4 z-[100] w-[min(92vw,26rem)] rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><i className="fa-solid fa-bell" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">New order received</p><p className="mt-1 text-xs text-slate-600">{adminOrderAlert.customer} Â· {adminOrderAlert.items} Â· GHâ‚µ {adminOrderAlert.amount}</p>
            <button onClick={() => { setAdminOrderAlert(null); window.history.pushState({}, '', '/admin/orders'); setRoutePath('/admin/orders'); }} className="mt-2 text-xs font-bold text-rose-700">View in Orders</button></div>
          <button aria-label="Dismiss order notification" onClick={() => setAdminOrderAlert(null)} className="text-slate-400">Ã—</button></div>
      </div>}
      {adminMessageAlert && <div role="status" className="fixed right-4 top-24 z-[100] w-[min(92vw,26rem)] rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700"><i className="fa-solid fa-message" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">New customer message</p><p className="mt-1 text-xs text-slate-600">{adminMessageAlert.sender}: {adminMessageAlert.text}</p>
            <button onClick={() => { setAdminMessageAlert(null); window.history.pushState({}, '', '/admin/messages'); setRoutePath('/admin/messages'); }} className="mt-2 text-xs font-bold text-violet-700">View message</button></div>
          <button aria-label="Dismiss message notification" onClick={() => setAdminMessageAlert(null)} className="text-slate-400">Ã—</button></div>
      </div>}
      <Suspense fallback={<div className="min-h-screen bg-rose-50/40" />}>
        {routePath === '/admin' ? <AdminLayoutComp adminProfile={adminProfile}
          onNavigate={(next) => { window.history.pushState({}, '', next); setRoutePath(next); }}
          onLogout={() => { logout(); window.history.replaceState({}, '', '/'); setRoutePath('/'); }} />
          : pages[routePath] || pages['/admin/overview']}
      </Suspense>
    </>;
  }

  if (routePath === '/search') return <><Suspense fallback={<div className="min-h-screen bg-white" />}><SearchPage onBack={() => navigateTo('/')} onChoose={choosePublicProduct} /></Suspense><Onupa products={products} onNavigate={navigateTo} onPickProduct={choosePublicProduct} /><WhatsAppButton href={adminWhatsAppHref} /></>;
  if (routePath === '/wishlist') return <><Suspense fallback={<div className="min-h-screen bg-white" />}><WishlistPage wishlist={wishlist} setWishlist={setWishlist} onBack={() => navigateTo('/')} onChoose={choosePublicProduct} /></Suspense><Onupa products={products} onNavigate={navigateTo} onPickProduct={choosePublicProduct} /><WhatsAppButton href={adminWhatsAppHref} /></>;
  if (routePath === '/faq') return <><Suspense fallback={<div className="min-h-screen bg-white" />}><FAQPage onBack={() => navigateTo('/')} /></Suspense><Onupa products={products} onNavigate={navigateTo} onPickProduct={choosePublicProduct} /><WhatsAppButton href={adminWhatsAppHref} /></>;
  if (routePath === '/login' || routePath === '/signup') return <Suspense fallback={<div className="min-h-screen bg-white" />}><AccountPage mode={routePath === '/signup' ? 'signup' : 'login'} onBack={() => navigateTo('/')} onNavigate={navigateTo} /></Suspense>;
  if (routePath === '/track' && activeTrackingOrder) return <Suspense fallback={<div className="h-screen bg-slate-100" />}><TrackOrder order={activeTrackingOrder} orders={orders} onOrderChange={setSelectedOrderForTracking} canShare={role === 'admin' || role === 'rider'} /></Suspense>;

  return (
    <div className="min-h-screen bg-rose-50/40 text-slate-800 font-sans overflow-x-hidden">
      {adminOrderAlert && <div role="status" className="fixed right-4 top-4 z-[100] w-[min(92vw,26rem)] rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><i className="fa-solid fa-bell" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">New order received</p><p className="mt-1 text-xs text-slate-600">{adminOrderAlert.customer} Â· {adminOrderAlert.items} Â· GHâ‚µ {adminOrderAlert.amount}</p>
            <button onClick={() => { setAdminOrderAlert(null); window.history.pushState({}, '', '/admin/orders'); setRoutePath('/admin/orders'); }} className="mt-2 text-xs font-bold text-rose-700">View in Orders</button></div>
          <button aria-label="Dismiss order notification" onClick={() => setAdminOrderAlert(null)} className="text-slate-400">Ã—</button></div>
      </div>}
      {isAdminAuthenticated && adminMessageAlert && <div role="status" className="fixed right-4 top-24 z-[100] w-[min(92vw,26rem)] rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700"><i className="fa-solid fa-message" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">New customer message</p><p className="mt-1 text-xs text-slate-600">{adminMessageAlert.sender}: {adminMessageAlert.text}</p>
            <button onClick={() => { setAdminMessageAlert(null); window.history.pushState({}, '', '/admin/messages'); setRoutePath('/admin/messages'); }} className="mt-2 text-xs font-bold text-violet-700">View message</button></div>
          <button aria-label="Dismiss message notification" onClick={() => setAdminMessageAlert(null)} className="text-slate-400">Ã—</button></div>
      </div>}

      {/* PRODUCT DETAILS MODAL */}
      {selectedProductModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-white/60 space-y-6 relative overflow-hidden">
            <button 
              onClick={() => setSelectedProductModal(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-600 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 rounded-2xl overflow-hidden bg-rose-50 shadow-inner">
                <img src={optimizeProductImage(selectedProductModal.mainImage)} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={selectedProductModal.name} />
                <button type="button" onClick={() => setShowSizeGuide(true)} className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700">View Size Guide</button>
              </div>
              <div className="flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-100 px-3 py-1 rounded-full">
                    {selectedProductModal.category}
                  </span>
                  <h3 className="text-xl font-serif font-bold text-slate-900 mt-2">{selectedProductModal.name}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{selectedProductModal.description}</p>
                  <div className="mt-4 rounded-2xl bg-amber-50 p-3"><p className="text-xs font-bold text-slate-800">â˜…â˜…â˜…â˜…â˜… <span className="ml-1 text-slate-600">Customer favourite</span></p><p className="mt-1 text-[11px] leading-5 text-slate-600">Customers love the style and value. Ask us about fit before ordering.</p></div>
                </div>

                <div className="space-y-3 pt-3 border-t border-rose-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold uppercase">Price</span>
                    <span className="text-2xl font-black text-slate-900">GHâ‚µ {effectivePrice(selectedProductModal)}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setCheckoutData({ ...checkoutData, selectedProductId: selectedProductModal.id, customItemName: selectedProductModal.name });
                      setSelectedProductModal(null);
                      setActiveView('store');
                      setTimeout(() => {
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      }, 200);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-500/30 transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-cart-shopping"></i> Order This Item Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSizeGuide && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[110] grid place-items-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setShowSizeGuide(false); }}><section className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"><div className="flex items-center"><h2 className="flex-1 text-lg font-bold">Size Guide</h2><button onClick={() => setShowSizeGuide(false)} aria-label="Close size guide" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X size={18} /></button></div><p className="mt-2 text-xs leading-5 text-slate-600">Sizes vary by product. Measure around the fullest part of your bust and hips, and around your natural waist. Contact Rabi with your measurements for a fit recommendation.</p><div className="mt-4 grid grid-cols-4 gap-1 text-center text-[10px]">{[['Size','Bust','Waist','Hip'],['S','84â€“88 cm','66â€“70 cm','90â€“94 cm'],['M','89â€“94 cm','71â€“76 cm','95â€“100 cm'],['L','95â€“102 cm','77â€“84 cm','101â€“108 cm']].flatMap((row,index) => row.map((cell,column) => <span key={`${index}-${column}`} className={`rounded-lg p-2 ${index === 0 ? 'bg-slate-100 font-bold' : 'bg-white text-slate-700'}`}>{cell}</span>))}</div><p className="mt-3 text-[10px] text-slate-400">Approximate guide only; item measurements may vary.</p></section></div>}

      {/* CALL ADMIN MODAL SELECTOR */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-rose-100 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner">
              <i className="fa-solid fa-headset"></i>
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-slate-900">Contact Rabi's Chic Admin</h3>
              <p className="text-xs text-slate-500 mt-1">Choose how you want to reach out for clarification on your order.</p>
            </div>

            <div className="space-y-3">
              {adminWhatsAppMessageHref ? <a
                href={adminWhatsAppMessageHref}
                target="_blank" 
                rel="noreferrer"
                onClick={() => setShowCallModal(false)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i> Chat on WhatsApp
              </a> : <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">WhatsApp contact is not set yet. Please try the phone number below.</p>}

              {adminPhoneHref ? <a
                href={adminPhoneHref}
                onClick={() => setShowCallModal(false)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-phone-volume text-sm"></i> Make Voice Call ({adminContact.phone})
              </a> : <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Phone support is not set up yet.</p>}
            </div>

            <button 
              onClick={() => setShowCallModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* NAVIGATION BAR */}
      <header className="bg-white/80 backdrop-blur-md border-b border-rose-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 py-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-4 min-h-14">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('store')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center font-serif font-bold text-xl shadow-md">
              R
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg md:text-xl text-slate-900 tracking-wide leading-tight">Rabi's Chic</h1>
              <p className="text-[9px] md:text-[10px] text-rose-500 uppercase tracking-widest font-semibold">UCC Campus Store</p>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="w-full md:w-auto md:flex-1 max-w-none md:max-w-md order-3 md:order-2">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input 
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onKeyDown={handleSearchKeyPress}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search products"
                aria-expanded={searchFocused && Boolean(searchQuery.trim())}
                aria-controls="product-search-results"
                className="w-full pl-9 pr-8 py-2 rounded-2xl bg-rose-50/60 border border-rose-200 text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
              {searchFocused && searchQuery.trim() && (
                <div id="product-search-results" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-rose-100 bg-white p-1 shadow-xl">
                  {searchResults.length ? searchResults.slice(0, 6).map(product => (
                    <button
                      key={product.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => { setSelectedProductModal(product); setSearchFocused(false); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-rose-50"
                    >
                      <img src={optimizeProductImage(product.mainImage)} loading="lazy" alt="" className="h-11 w-9 rounded object-cover" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-900">{product.name}</span><span className="text-[10px] text-slate-500">{product.category} Â· GHâ‚µ {product.price}</span></span>
                    </button>
                  )) : <p role="status" className="px-3 py-3 text-xs text-slate-500">No products match â€œ{searchQuery.trim()}â€.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 order-2 md:order-3 max-w-full pb-0">
            <button onClick={() => navigateTo('/')} className="hidden px-2.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950 xl:inline-flex">Home</button>
            <button 
              onClick={() => navigateTo('/shop')}
              className={`hidden md:flex px-2.5 py-2 rounded-xl text-sm font-semibold transition items-center gap-1 whitespace-nowrap ${activeView === 'store' ? 'text-slate-950' : 'text-slate-600 hover:text-slate-950'}`}
            >
              <i className="fa-solid fa-bag-shopping"></i> Store
            </button>

            <button 
              onClick={() => navigateTo('/track')}
              className="hidden xl:flex px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 whitespace-nowrap"
            >
              <i className="fa-solid fa-map-location-dot"></i> Track Order
            </button>

            <button 
              onClick={() => navigateTo('/orders')}
              className="hidden xl:flex px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 whitespace-nowrap"
            >
              <i className="fa-solid fa-magnifying-glass-chart"></i> Lookup
            </button>

            <button 
              onClick={() => navigateTo('/about')}
              className="hidden lg:flex px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 whitespace-nowrap"
            >
              <i className="fa-solid fa-heart"></i> About
            </button>

            <button 
              onClick={() => navigateTo('/contact')}
              className="hidden lg:flex px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 whitespace-nowrap"
            >
              <i className="fa-solid fa-address-book"></i> Contact
            </button>
            <button onClick={() => navigateTo('/faq')} className="hidden xl:inline-flex px-2 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950">FAQ</button>

            <button onClick={() => navigateTo('/search')} aria-label="Open search" title="Search" className="hidden md:grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"><SearchIcon size={18} /></button>
            <button onClick={() => navigateTo('/wishlist')} aria-label="Open wishlist" title="Wishlist" className="hidden md:grid relative h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"><Heart size={18} />{wishlist.length > 0 && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-slate-900 px-1 text-[9px] font-bold text-white">{wishlist.length}</span>}</button>
            <button onClick={() => { navigateTo('/shop'); window.setTimeout(() => document.getElementById('order-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); }} aria-label="Go to order checkout" title="Cart / checkout" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"><ShoppingBag size={18} /><span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-slate-900 px-1 text-[9px] font-bold text-white">{checkoutData.quantity || 0}</span></button>

            {!user ? <div className="hidden items-center gap-1 md:flex"><button onClick={() => navigateTo('/login')} className="rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Login</button><button onClick={() => navigateTo('/signup')} className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Sign Up</button></div>
              : <div className="relative hidden md:block"><button onClick={() => setAccountMenuOpen(value => !value)} aria-label="Account menu" className="flex h-10 items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 text-xs font-semibold"><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-700"><UserRound size={16} /></span><ChevronDown size={14} /></button>
                {accountMenuOpen && <div className="absolute right-0 top-12 z-[90] w-52 rounded-xl border border-slate-100 bg-white p-2 shadow-xl"><p className="truncate px-3 py-2 text-[11px] text-slate-500">{user.email}</p><button onClick={() => navigateTo('/orders')} className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-slate-50">My Orders</button><button onClick={() => navigateTo('/wishlist')} className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-slate-50">Wishlist</button>{isAdminAccount && <button onClick={() => navigateTo('/admin')} className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50">Admin Portal</button>}<button onClick={() => { logout(); navigateTo('/login'); }} className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50">Log Out</button></div>}
              </div>}

            <button onClick={() => setMobileMenuOpen(value => !value)} aria-label="Open navigation" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 md:hidden">{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>

            {/* Only an authenticated administrator sees the dashboard link. */}
            {isAdminAccount && (
              <button
                onClick={() => { window.history.pushState({}, '', '/admin'); setRoutePath('/admin'); }}
                className="hidden xl:flex px-2.5 py-2 rounded-xl text-xs font-bold transition items-center gap-1 whitespace-nowrap bg-slate-900 text-white hover:bg-slate-800"
              >
                <i className="fa-solid fa-user-shield"></i> Admin Portal
              </button>
            )}
          </div>
        </div>
        {mobileMenuOpen && <nav className="fixed right-0 top-0 z-[100] h-dvh w-[80vw] max-w-80 overflow-y-auto border-l border-slate-200 bg-white px-4 py-4 shadow-2xl md:hidden"><div className="mb-5 flex items-center justify-between"><span className="font-bold">Menu</span><button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X size={20} /></button></div><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Shop</p><div className="grid grid-cols-1 gap-1">
          {[['Home','/'],['Store','/shop'],['Track Order','/track'],['My Orders','/orders'],['Wishlist','/wishlist'],['Search','/search'],['About','/about'],['Contact','/contact'],['FAQ','/faq']].map(([label,path]) => <button key={path + label} onClick={() => navigateTo(path)} className="min-h-11 rounded-xl bg-slate-50 px-3 text-left text-sm font-semibold text-slate-700">{label}</button>)}
          {!user ? <><button onClick={() => navigateTo('/login')} className="min-h-11 rounded-xl border border-slate-200 px-3 text-left text-sm font-bold">Login</button><button onClick={() => navigateTo('/signup')} className="min-h-11 rounded-xl bg-slate-950 px-3 text-left text-sm font-bold text-white">Sign Up</button></> : <button onClick={() => { logout(); navigateTo('/login'); }} className="min-h-11 rounded-xl bg-red-50 px-3 text-left text-sm font-bold text-red-700">Log Out</button>}
          {isAdminAccount && <button onClick={() => navigateTo('/admin')} className="min-h-11 rounded-xl bg-slate-950 px-3 text-left text-sm font-bold text-white">Admin Portal</button>}
        </div></nav>}
      </header>

      {siteContent?.noticeBar?.active && siteContent.noticeBar.text && <div role="status" className={`px-4 py-2 text-center text-xs font-semibold ${siteContent.noticeBar.type === 'sale' ? 'bg-black text-white' : siteContent.noticeBar.type === 'out_of_stock' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800'}`}>{siteContent.noticeBar.text}</div>}

      {/* STORE VIEW */}
      {activeView === 'store' && (
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 md:space-y-10">

          {/* HERO BANNER SLIDESHOW */}
          <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden shadow-xl bg-slate-900" onTouchStart={event => { event.currentTarget.dataset.touchX = String(event.touches[0].clientX); }} onTouchEnd={event => { const start = Number(event.currentTarget.dataset.touchX); const dx = event.changedTouches[0].clientX - start; if (Math.abs(dx) > 45 && slides.length > 1) setCurrentSlideIndex(index => (index + (dx < 0 ? 1 : slides.length - 1)) % slides.length); }}>
            {slides.length > 0 && (
              <>
                <img 
                  src={slides[currentSlideIndex]?.url} 
                  className="w-full h-full object-cover transition-all duration-700 opacity-90"
                  alt="Banner" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-5 md:p-8 text-white">
                  <span className="bg-rose-500 text-white text-[9px] md:text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider w-max mb-2">
                    {slides[currentSlideIndex]?.badge && slides[currentSlideIndex].badge !== 'None' ? slides[currentSlideIndex].badge : 'UCC Campus Exclusive'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold leading-tight">{slides[currentSlideIndex]?.title || publicHero.title}</h2>
                  <p className="text-xs md:text-sm text-rose-100 mt-1">{slides[currentSlideIndex]?.subtitle || publicHero.subtitle || 'Fast UCC hostel delivery with live GPS tracking.'}</p>
                  <a href={slides[currentSlideIndex]?.buttonLink || publicHero.ctaLink || '#store'} className="mt-4 inline-flex w-max items-center rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-slate-800">
                    {slides[currentSlideIndex]?.buttonText || publicHero.ctaText || 'Shop Now'}
                  </a>
                </div>
              </>
            )}
            <button 
              onClick={() => setCurrentSlideIndex((currentSlideIndex - 1 + slides.length) % slides.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition"
            >
              <i className="fa-solid fa-chevron-left text-xs md:text-base"></i>
            </button>
            <button 
              onClick={() => setCurrentSlideIndex((currentSlideIndex + 1) % slides.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition"
            >
              <i className="fa-solid fa-chevron-right text-xs md:text-base"></i>
            </button>
            {slides.length > 1 && <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">{slides.map((slide, index) => <button key={slide.id} type="button" aria-label={`Show slide ${index + 1}`} onClick={() => setCurrentSlideIndex(index)} className={`h-2 rounded-full transition-all ${index === currentSlideIndex ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} />)}</div>}
          </div>

          {/* CATEGORIES */}
          <div id="store" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-xl md:text-2xl text-slate-900">Browse Collections</h3>
              <span className="text-xs text-rose-500 font-semibold">{filteredProducts.length} Items</span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 md:px-5 py-2 md:py-2.5 rounded-2xl text-xs font-bold transition flex-shrink-0 ${selectedCategory === cat ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-white text-slate-600 border border-rose-100 hover:bg-rose-50'}`}
                >
                  {cat === 'All' ? 'âœ¨ All Products' : cat}
                </button>
              ))}
            </div>
          </div>

          {siteContent?.featured?.productIds?.length > 0 && <section className="space-y-4">
            <div><h3 className="font-serif font-bold text-xl md:text-2xl text-slate-900">Featured Picks</h3><p className="mt-1 text-xs text-slate-500">Handpicked for your next look.</p></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {siteContent.featured.productIds.map(id => products.find(item => String(item.id) === String(id))).filter(Boolean).map(product => <button key={product.id} onClick={() => setSelectedProductModal(product)} className="overflow-hidden rounded-2xl border border-rose-100 bg-white text-left shadow-sm">
                <img src={optimizeProductImage(product.mainImage)} alt={product.name} className="h-36 w-full object-cover" />
                <span className="block truncate px-3 pt-2 text-xs font-bold text-slate-900">{product.name}</span>
                <span className="block px-3 pb-3 text-xs text-rose-700">GHâ‚µ {effectivePrice(product)}</span>
              </button>)}
            </div>
          </section>}

          {/* PRODUCTS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => setSelectedProductModal(product)}
                className="bg-white rounded-3xl p-4 border border-rose-100 shadow-sm hover:shadow-xl transition group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="relative h-48 sm:h-56 md:h-60 rounded-2xl overflow-hidden mb-4 bg-rose-50">
                    <img src={optimizeProductImage(product.mainImage)} loading="lazy" decoding="async" className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${['out_of_stock','sold'].includes(product.status) ? 'grayscale opacity-50' : ''}`} alt={product.name} />
                    <button type="button" aria-label={wishlist.some(id => String(id) === String(product.id)) ? 'Remove from wishlist' : 'Add to wishlist'} onClick={(event) => { event.stopPropagation(); toggleWishlist(product.id); }} className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-rose-600 shadow"><Heart size={18} fill={wishlist.some(id => String(id) === String(product.id)) ? 'currentColor' : 'none'} /></button>
                    {product.status && product.status !== 'in_stock' && <span className={`absolute left-14 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${product.status === 'just_sold' ? 'bg-orange-100 text-orange-800' : product.status === 'out_of_stock' ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-800'}`}>{product.status === 'just_sold' ? 'Just Sold' : product.status === 'out_of_stock' ? 'Out of Stock' : 'Sold Out'}</span>}
                    {['out_of_stock','sold'].includes(product.status) && <span className="absolute inset-0 flex items-center justify-center bg-slate-900/20 text-sm font-black uppercase tracking-widest text-white">Unavailable</span>}
                    <span className="absolute right-3 top-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-rose-600">
                      â˜… {product.rating}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg">
                    {product.category}
                  </span>
                  <h4 className="font-bold text-slate-900 mt-2 line-clamp-1">{product.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Price</span>
                    <div className="text-base md:text-lg font-black text-slate-900">GHâ‚µ {effectivePrice(product)}</div>
                    {Number(product.discount) > 0 && <div className="text-[10px] text-slate-500"><span className="line-through">GHâ‚µ {product.price}</span> Â· {product.discount}% off</div>}
                  </div>
                  <button 
                    disabled={['out_of_stock','sold'].includes(product.status)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCheckoutData({ ...checkoutData, selectedProductId: product.id, customItemName: product.name });
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                    className="bg-rose-500 hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-400 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-rose-200"
                  >
                    {['out_of_stock','sold'].includes(product.status) ? 'Unavailable' : 'Order Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ORDER & INVOICE FORM */}
          <div id="order-checkout" className="scroll-mt-24 bg-white p-5 md:p-8 rounded-3xl border border-rose-100 shadow-sm max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-serif font-bold text-xl md:text-2xl text-slate-900">Place UCC Hostel Order & Calculate Invoice</h3>
                <p className="text-xs text-slate-500 mt-1">Select or type your item, enter your valid Ghana phone number, and specific room number.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowCallModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow transition"
              >
                <i className="fa-solid fa-phone-volume"></i> Call Admin
              </button>
            </div>

            {orderStage === 'idle' && (
              <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Catalog Product Or Type Below</label>
                    <select 
                      value={checkoutData.selectedProductId}
                      onChange={(e) => {
                        const prodId = e.target.value;
                        const p = products.find(x => x.id === Number(prodId));
                        setCheckoutData({ ...checkoutData, selectedProductId: prodId, customItemName: p ? p.name : '' });
                      }}
                      className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold focus:outline-none focus:border-rose-500 mb-2"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} â€” GHâ‚µ {p.price}</option>
                      ))}
                    </select>

                    <label className="block text-xs font-bold text-rose-600 uppercase mb-1 mt-3">Or Type Exact Item Name You Want</label>
                    <input 
                      type="text"
                      placeholder="e.g. Lip Mask, Scrunchies, Official Clothes..."
                      value={checkoutData.customItemName}
                      onChange={(e) => setCheckoutData({ ...checkoutData, customItemName: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs focus:outline-none focus:border-rose-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Quantity</label>
                    <input 
                      type="number"
                      min="1"
                      max="10"
                      value={checkoutData.quantity}
                      onChange={(e) => setCheckoutData({ ...checkoutData, quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-sm font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Your Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Abena Osei"
                      value={checkoutData.name}
                      onChange={(e) => setCheckoutData({ ...checkoutData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ghana Phone Number *</label>
                      <input 
                        type="tel"
                        required
                        placeholder="024XXXXXXX or +233..."
                        value={checkoutData.phone}
                        onChange={(e) => setCheckoutData({ ...checkoutData, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-sm focus:outline-none focus:border-rose-500 font-bold"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Ghana format (+233 / 0...)</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Delivery Hostel</label>
                      <select 
                        value={checkoutData.hostel}
                        onChange={(e) => setCheckoutData({ ...checkoutData, hostel: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold focus:outline-none focus:border-rose-500"
                      >
                        <option>Casely Hayford Hall</option>
                        <option>Valco Hall</option>
                        <option>Oguaa Hall</option>
                        <option>Adehye Hall</option>
                        <option>Superannuation</option>
                        <option>KNH Hostel</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email for your invoice *</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={checkoutData.email}
                      onChange={(e) => setCheckoutData({ ...checkoutData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-sm focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Weâ€™ll email your invoice and order confirmation here.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Delivery option</label>
                      <select value={checkoutData.deliveryOption} onChange={(e) => setCheckoutData({ ...checkoutData, deliveryOption: e.target.value, ...(e.target.value !== 'ucc' && checkoutData.paymentMethod === 'Cash on Delivery' ? { paymentMethod: 'MTN MoMo' } : {}) })} className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold">
                        <option value="ucc">UCC Campus Same Day · Free</option>
                        <option value="accra">Accra · 1-2 Days · GHS 30</option>
                        <option value="outside">Outside Accra · 2-3 Days · GHS 50</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Payment</label>
                      <select value={checkoutData.paymentMethod} onChange={(e) => setCheckoutData({ ...checkoutData, paymentMethod: e.target.value, ...(e.target.value === 'Cash on Delivery' ? { deliveryOption: 'ucc' } : {}) })} className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold">
                        <option value="MTN MoMo">MoMo (MTN / Telecel)</option>
                        <option value="Cash on Delivery">Cash on Delivery (UCC campus)</option>
                      </select>
                      {checkoutData.paymentMethod === 'Cash on Delivery' ? <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">Pay the rider when your order arrives on UCC campus.</p> : <div className="mt-2 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><p>Pay to MoMo number <b>055 123 4567</b><br/>Account name: <b>Rabis Chic</b></p><a href={adminWhatsAppMessageHref} target="_blank" rel="noreferrer" className="mt-1 inline-flex font-bold underline">Send payment confirmation on WhatsApp</a></div>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-rose-600 uppercase mb-1">Specific Room Number / Location Details *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Room 204, Block B, Floor 2"
                      value={checkoutData.roomNumber}
                      onChange={(e) => setCheckoutData({ ...checkoutData, roomNumber: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-rose-300 text-xs font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-5 md:p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[9px] text-rose-400 font-mono font-bold uppercase tracking-wider block">
                          Rabi's Store Official Invoice
                        </span>
                        <h4 className="text-base md:text-lg font-bold">Checkout Summary</h4>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
                        <i className="fa-solid fa-receipt"></i>
                      </div>
                    </div>

                    <div className="my-4 space-y-3 text-xs">
                      <div className="flex justify-between text-slate-300 gap-2">
                        <span>Item ({checkoutData.quantity}x):</span>
                        <span className="font-bold text-white text-right">{checkoutData.customItemName || currentOrderProduct.name}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Subtotal:</span>
                        <span className="font-mono text-white">GHâ‚µ {orderSubtotal}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Delivery ({checkoutData.deliveryOption}):</span>
                        <span className="font-mono text-white">GHâ‚µ {orderDeliveryFee}</span>
                      </div>
                      {orderDiscount > 0 && <div className="flex justify-between text-emerald-300"><span>CHIC10 discount:</span><span className="font-mono">âˆ’ GHâ‚µ {orderDiscount.toFixed(2)}</span></div>}
                      <label className="block text-[10px] font-bold text-slate-300">Coupon code<input value={checkoutData.couponCode} onChange={event => setCheckoutData({ ...checkoutData, couponCode: event.target.value.toUpperCase() })} placeholder="CHIC10" className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs text-white placeholder:text-slate-400" /></label>
                      <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
                        <span className="font-bold text-rose-400">Total Amount:</span>
                        <span className="text-lg font-black font-mono text-white">GHâ‚µ {orderTotal}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <i className="fa-solid fa-paper-plane"></i> Submit Order & Notify Admin
                  </button>
                </div>

              </form>
            )}

            {orderStage !== 'idle' && (
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto text-xl shadow-lg">
                  <i className="fa-solid fa-check"></i>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-lg text-emerald-900">Order Submitted Successfully!</h4>
                  <p className="text-xs text-emerald-700 mt-1">Your order has been sent to Rabi's admin dashboard. Once approved, the live Google Maps map will track your delivery.</p>
                  <p className="text-xs text-emerald-700 mt-1">Order {selectedOrderForTracking?.id} Â· Invoice email: {selectedOrderForTracking?.notificationStatus?.customerEmail === 'sent' ? 'sent' : selectedOrderForTracking?.notificationStatus?.customerEmail === 'queued' ? 'being sent' : selectedOrderForTracking?.notificationStatus?.customerEmail === 'failed' ? 'could not be sent' : 'email service needs setup'}</p>
                  {selectedOrderForTracking?.invoice && <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 text-left text-xs text-slate-700">
                    <p className="font-bold text-slate-900">Invoice for {selectedOrderForTracking.items}</p>
                    <p className="mt-1">Quantity: {selectedOrderForTracking.quantity} Â· Delivery: GHâ‚µ {selectedOrderForTracking.invoice.deliveryFee}</p>
                    <p className="mt-1 font-black text-emerald-800">Total: GHâ‚µ {selectedOrderForTracking.invoice.total}</p>
                    <p className="mt-1 text-slate-500">A copy will be sent to {selectedOrderForTracking.email} by email.</p>
                  </div>}
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button 
                    onClick={() => setActiveView('tracker')}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow transition"
                  >
                    <i className="fa-solid fa-map-location-dot mr-1.5"></i> Open Live Map
                  </button>
                  <button 
                    onClick={() => setOrderStage('idle')}
                    className="px-5 py-3 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-2xl border border-emerald-300 transition"
                  >
                    Place Another Order
                  </button>
                </div>
              </div>
            )}
          </div>

          <section className="space-y-4 rounded-3xl bg-white p-5 md:p-7">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-rose-500">Follow along</p><h3 className="mt-1 font-serif text-xl font-bold text-slate-900">Find us on Instagram</h3></div><a href="https://www.instagram.com/rabischic/" target="_blank" rel="noreferrer" className="text-xs font-bold text-slate-700">@rabischic â†—</a></div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{products.slice(0, 6).map(product => <button key={`social-${product.id}`} onClick={() => setSelectedProductModal(product)} className="aspect-square overflow-hidden rounded-xl bg-slate-100"><img src={optimizeProductImage(product.mainImage)} loading="lazy" alt={product.name} className="h-full w-full object-cover transition hover:scale-105" /></button>)}</div>
          </section>
        </main>
      )}

      {/* LIVE TRACKING MAP VIEW */}
      {activeView === 'tracker' && <Suspense fallback={<main className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-500">Loading delivery map...</main>}><TrackOrder order={activeTrackingOrder} orders={orders} onOrderChange={setSelectedOrderForTracking} canShare={role === 'admin' || role === 'rider'} /></Suspense>}

      {/* LOOKUP VIEW */}
      {activeView === 'lookup' && (
        <main className="max-w-2xl mx-auto px-4 py-12 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-rose-100 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-magnifying-glass-chart"></i>
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-900">Track Your Order Status</h2>
              <p className="text-xs text-slate-500 mt-1">Enter your order ID followed by the phone number used at checkout.</p>
            </div>

            <form onSubmit={handleLookupOrder} className="flex gap-2 max-w-md mx-auto">
              <input 
                type="text"
                required
                placeholder="RABI-1234ABCD 0241234567"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-rose-200 text-xs focus:outline-none focus:border-amber-500 font-bold"
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-2xl shadow transition"
              >
                Search
              </button>
            </form>
          </div>

          {lookupResult === 'not_found' && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center text-xs text-rose-700 font-semibold">
              No order found matching "{lookupQuery}". Please check your Order ID or phone number.
            </div>
          )}

          {lookupResult && lookupResult !== 'not_found' && (
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-md space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-rose-50">
                <div>
                  <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">{lookupResult.id}</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{lookupResult.customer}</h3>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  {lookupResult.status}
                </span>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p>ðŸ“¦ <strong>Items:</strong> {lookupResult.items} (Qty: {lookupResult.quantity})</p>
                <p>ðŸ“ <strong>Hostel Destination:</strong> {lookupResult.hostel} â€” Room: {lookupResult.room}</p>
                <p>ðŸ’° <strong>Total Amount:</strong> GHâ‚µ {lookupResult.amount}</p>
              </div>
              <button onClick={() => { setSelectedOrderForTracking(lookupResult); setActiveView('tracker'); }} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white">
                <i className="fa-solid fa-map-location-dot mr-2"></i>Track delivery
              </button>
            </div>
          )}
        </main>
      )}

      {/* ABOUT VIEW */}
      {activeView === 'about' && (
        <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-rose-100 shadow-sm text-center space-y-4">
            <img src={adminProfile.avatar} className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-rose-200 shadow-md" alt="Rabi" />
            <h2 className="text-3xl font-serif font-bold text-slate-900">About {adminProfile.name || "Rabi's Chic Store"}</h2>
            <p className="text-xs md:text-sm text-rose-600 font-semibold max-w-lg mx-auto">{adminProfile.title}</p>
            <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed mt-2">{adminProfile.bio}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-xl">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Fast Hostel Delivery</h3>
              <p className="text-xs text-slate-500">Direct-to-room delivery across all UCC halls including Casely Hayford, Valco, and Oguaa.</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto text-xl">
                <i className="fa-solid fa-gem"></i>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Curated Excellence</h3>
              <p className="text-xs text-slate-500">Every dress, handbag, and cosmetic product is carefully selected for quality and style.</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-xl">
                <i className="fa-solid fa-hand-holding-dollar"></i>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Student-Friendly Prices</h3>
              <p className="text-xs text-slate-500">Elegance and quality tailored to suit student budgets right here on campus.</p>
            </div>
          </div>
        </main>
      )}

      {/* CONTACT VIEW */}
      {activeView === 'contact' && (
        <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-serif font-bold text-slate-900">Get in Touch with Rabi</h2>
            <p className="text-xs text-slate-500">Have questions about an item, delivery times, or custom requests? We'd love to help!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-rose-100 shadow-sm space-y-6">
              <h3 className="font-serif font-bold text-xl text-slate-900">Contact Information</h3>
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-4 p-3 bg-rose-50/50 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center text-base">
                    <i className="fa-solid fa-phone"></i>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Phone Support</span>
                    {adminPhoneHref ? <a href={adminPhoneHref} className="font-bold text-slate-900 text-sm">{adminContact.phone}</a> : <span className="text-slate-500">Not available yet</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-emerald-50/50 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base">
                    <i className="fa-brands fa-whatsapp"></i>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">WhatsApp Support</span>
                    {adminWhatsAppHref ? <a href={adminWhatsAppHref} target="_blank" rel="noreferrer" className="font-bold text-slate-900 text-sm">Chat on WhatsApp</a> : <span className="text-slate-500">Not available yet</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-base">
                    <i className="fa-solid fa-location-dot"></i>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Location</span>
                    <span className="font-bold text-slate-900">{adminContact.location}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-rose-50">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">UCC Delivery Coverage</h4>
                <p className="text-xs text-slate-500 leading-relaxed">Casely Hayford, Valco, Oguaa, Adehye, Superannuation, and KNH Hostels.</p>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl border border-rose-100 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-xl text-slate-900">Send Direct Message</h3>
              {contactSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto text-lg">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <h4 className="font-bold text-emerald-900 text-sm">Message Sent!</h4>
                  <p className="text-xs text-emerald-700">Rabi has received your message in the admin panel and will respond shortly.</p>
                  <button onClick={() => setContactSubmitted(false)} className="text-xs font-bold text-emerald-800 underline mt-2">Send another note</button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Your Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Your full name..."
                      value={contactMsg.name}
                      onChange={(e) => setContactMsg({ ...contactMsg, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ghana Phone Number</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="024XXXXXXX"
                      value={contactMsg.phone}
                      onChange={(e) => setContactMsg({ ...contactMsg, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Message / Note</label>
                    <textarea 
                      required
                      rows="4"
                      placeholder="How can we help you?"
                      value={contactMsg.note}
                      onChange={(e) => setContactMsg({ ...contactMsg, note: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs focus:outline-none focus:border-rose-500"
                    ></textarea>
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-2xl shadow transition">
                    Send Inquiry Note
                  </button>
                </form>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ADMIN VIEW WITH VERTICAL LEFT SIDEBAR & GLASSMORPHISM THEME */}
      {activeView === 'admin' && (
        <main className="max-w-7xl mx-auto px-4 py-8">
          {isAdminAccount && !adminUnlocked ? (
            <section className="mx-auto max-w-md space-y-5 rounded-2xl border border-rose-100 bg-white p-7 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700"><ShieldCheck size={26} /></div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-slate-900">Unlock admin dashboard</h2>
                <p className="mt-2 text-sm text-slate-600">Signed in as {user.email}. Verify with this device to continue.</p>
              </div>
              {adminPasskeys.length > 0 && <button onClick={unlockAdminWithPasskey} disabled={passkeyBusy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60"><Fingerprint size={19} />{passkeyBusy ? 'Waiting for deviceâ€¦' : 'Use Face ID, fingerprint, or device PIN'}</button>}
              {adminPasskeys.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-left text-xs text-amber-900">No device passkey is registered yet. Unlock with your admin password, then set one up in Security.</p>}
              <details className="rounded-xl border border-slate-200 p-3 text-left">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Use admin password instead</summary>
                <form onSubmit={unlockAdminWithPassword} className="mt-3 space-y-3">
                  <input type="password" required autoComplete="current-password" value={unlockPassword} onChange={(event) => setUnlockPassword(event.target.value)} placeholder="Admin password" className="w-full rounded-lg border border-rose-200 px-3 py-2.5 text-sm" />
                  <button type="submit" disabled={passkeyBusy} className="w-full rounded-lg bg-rose-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{passkeyBusy ? 'Verifyingâ€¦' : 'Unlock with password'}</button>
                </form>
              </details>
              {passkeyMessage && <p role="status" className="text-xs text-slate-600">{passkeyMessage}</p>}
              <button onClick={() => { lockAdmin(); setActiveView('store'); }} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Back to store</button>
            </section>
          ) : !isAdminAuthenticated ? (
            <div className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl border border-white/60 shadow-xl max-w-md mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl shadow">
                <i className="fa-solid fa-user-shield"></i>
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-900">{user ? 'Account access' : 'Admin sign-in'}</h2>
                <p className="text-xs text-slate-500 mt-1">{user ? `Signed in as ${user.email}` : 'This area is restricted to authorized administrators.'}</p>
              </div>

              {user ? (
                <div className="space-y-4">
                  <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{role === 'rider' ? 'This area is restricted to administrators. Contact the store for assistance.' : 'This area is restricted to administrators. Please contact Rabi on WhatsApp for help.'}</p>
                  {whatsappLink(adminContact.whatsapp, 'Hello, I need help with access to Rabiâ€™s Chic store.') && <a href={whatsappLink(adminContact.whatsapp, 'Hello, I need help with access to Rabiâ€™s Chic store.')} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white"><i className="fa-brands fa-whatsapp text-base"></i> Contact Rabi on WhatsApp</a>}
                  <button onClick={() => { logout(); setAuthMessage(''); }} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white">Logout</button>
                </div>
              ) : <form onSubmit={async (e) => {
                e.preventDefault();
                setAuthError(false);
                setLoginRestricted(false);
                setAuthMessage('');
                try {
                  const account = await login(authEmail, adminPasswordInput);
                  if (account.role !== 'admin') {
                    logout();
                    setLoginRestricted(true);
                    setAuthMessage('Admin access is restricted. Please contact Rabi on WhatsApp for assistance.');
                  }
                } catch (error) {
                  setAuthMessage(error.response?.data?.detail || 'Could not authenticate. Check your details and try again.');
                  setAuthError(true);
                }
              }} className="space-y-4">
                <input type="email" required autoComplete="email" placeholder="Email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-rose-200 text-sm" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-rose-200 text-sm"
                />
                {authError && (
                  <p role="alert" className="text-xs text-rose-600 font-semibold">{authMessage}</p>
                )}
                {authMessage && !authError && (
                  <p role="status" className="text-xs text-amber-700 font-semibold">{authMessage}</p>
                )}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-lg transition uppercase tracking-wider"
                >
                  Sign in
                </button>
                {loginRestricted && whatsappLink(adminContact.whatsapp, 'Hello, I need help with access to Rabiâ€™s Chic store.') && <a href={whatsappLink(adminContact.whatsapp, 'Hello, I need help with access to Rabiâ€™s Chic store.')} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white"><i className="fa-brands fa-whatsapp text-base"></i> Contact Rabi on WhatsApp</a>}
              </form>}
            </div>
          ) : (
            <>
            <div className="mb-5 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
              <span className="text-sm font-semibold text-slate-700">Signed in as {user.email}</span>
              <button onClick={() => { logout(); setActiveView('store'); }} className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><LogOut size={15} /> Logout</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              
              {/* VERTICAL LEFT SIDEBAR NAV - AdminLayoutComp */}
              <Suspense fallback={null}>
              <AdminLayoutComp
                adminTab={adminTab}
                setAdminTab={setAdminTab}
                adminProfile={adminProfile}
                orders={orders}
                messages={messages}
                lockAdmin={lockAdmin}
                setActiveView={setActiveView}
              />
              </Suspense>
              {false && <aside className="md:col-span-1 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm space-y-6">
                <div className="flex items-center gap-3 p-2">
                  <img src={adminProfile.avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-200 shadow" alt="Admin" />
                  <div>
                    <h3 className="font-serif font-bold text-sm text-slate-900">{adminProfile.name}</h3>
                    <p className="text-[10px] text-rose-500 font-semibold">{adminProfile.title}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <button 
                    onClick={() => setAdminTab('overview')}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 ${adminTab === 'overview' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-rose-50'}`}
                  >
                    <i className="fa-solid fa-chart-pie text-sm"></i> Overview
                  </button>
                  <button 
                    onClick={() => setAdminTab('approvals')}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between ${adminTab === 'approvals' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-rose-50'}`}
                  >
                    <span className="flex items-center gap-3">
                      <i className="fa-solid fa-circle-check text-sm"></i> Approvals
                    </span>
                    {orders.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold">{orders.length}</span>
                    )}
                  </button>
                  <button 
                    onClick={() => setAdminTab('messages')}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between ${adminTab === 'messages' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-rose-50'}`}
                  >
                    <span className="flex items-center gap-3">
                      <i className="fa-solid fa-envelope text-sm"></i> Messages
                    </span>
                    {messages.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-extrabold">{messages.length}</span>
                    )}
                  </button>
                  <button 
                    onClick={() => setAdminTab('catalog')}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 ${adminTab === 'catalog' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-rose-50'}`}
                  >
                    <i className="fa-solid fa-boxes-stacked text-sm"></i> Catalog
                  </button>
                  <button 
                    onClick={() => setAdminTab('contact')}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 ${adminTab === 'contact' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-rose-50'}`}
                  >
                    <i className="fa-solid fa-sliders text-sm"></i> Contact Settings
                  </button>
                  <button
                    onClick={() => setAdminTab('profile')}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 ${adminTab === 'profile' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-rose-50'}`}
                  >
                    <i className="fa-solid fa-user-pen text-sm"></i> Profile
                  </button>
                  <button 
                    onClick={() => setAdminTab('security')}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 ${adminTab === 'security' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-rose-50'}`}
                  >
                    <i className="fa-solid fa-lock text-sm"></i> Security
                  </button>
                  <button
                    onClick={() => { lockAdmin(); setPasskeyMessage('Admin dashboard locked. Verify to unlock it again.'); }}
                    className="w-full px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 transition flex items-center gap-3 hover:bg-rose-50"
                  >
                    <i className="fa-solid fa-lock text-sm"></i> Lock Dashboard
                  </button>
                  <button
                    onClick={() => { logout(); setActiveView('store'); }}
                    className="w-full px-4 py-3 rounded-2xl text-xs font-bold text-rose-700 transition flex items-center gap-3 hover:bg-rose-50"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </aside>}

              {/* MAIN CONTENT AREA */}
              <section className="md:col-span-3">
                {/* ADMIN TAB: OVERVIEW */}
                {adminTab === 'overview' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Products</span>
                      <div className="text-3xl font-black text-slate-900">{products.length}</div>
                      <p className="text-[11px] text-rose-500 font-medium">Active items in UCC store</p>
                    </div>
                    <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Customer Orders</span>
                      <div className="text-3xl font-black text-slate-900">{orders.length}</div>
                      <p className="text-[11px] text-emerald-600 font-medium">Hostel delivery requests</p>
                    </div>
                    <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Incoming Messages</span>
                      <div className="text-3xl font-black text-slate-900">{messages.length}</div>
                      <p className="text-[11px] text-amber-600 font-medium">Contact form inquiries</p>
                    </div>
                  </div>
                )}

                {/* ADMIN TAB: ORDER APPROVALS */}
                {adminTab === 'approvals' && (
                  <div className="space-y-6 bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-serif font-bold text-xl text-slate-900">Order Approvals & Dispatch</h3>
                        <p className="text-xs text-slate-500 mt-1">Review incoming customer hostel orders and approve to start live GPS delivery map.</p>
                      </div>
                      <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                        {orders.length} Total Orders
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {orders.length === 0 ? (
                        <div className="bg-rose-50/50 p-8 rounded-3xl text-center text-slate-400 border border-rose-100 text-xs font-medium">
                          No customer orders placed yet.
                        </div>
                      ) : (
                        orders.map((order) => (
                          <div key={order.id} className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-rose-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-rose-300 transition">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg">{order.id}</span>
                                <span className="text-xs font-bold text-slate-900">{order.customer}</span>
                                <span className="text-xs text-slate-400">({order.phone})</span>
                              </div>
                              <p className="text-xs text-slate-700 font-medium">
                                ðŸ“¦ <strong className="text-slate-900">{order.items}</strong> (Qty: {order.quantity}) â€” Total: <strong className="text-rose-600">GHâ‚µ {order.amount}</strong>
                              </p>
                              <p className="text-[11px] text-slate-500">
                                ðŸ“ Hostel Location: <strong className="text-slate-800">{order.hostel} â€” Room: {order.room}</strong>
                              </p>
                              <div className="inline-block mt-1">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${order.status.includes('Approved') || order.status.includes('Transit') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                                  Status: {order.status}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                              {riders.length > 0 && (
                                <select aria-label={`Assign courier for ${order.id}`} value={order.riderUserId || ''} onChange={(event) => assignRider(order.id, event.target.value)} className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs">
                                  <option value="">Assign rider</option>
                                  {riders.map(rider => <option key={rider.id} value={rider.id}>{rider.name}</option>)}
                                </select>
                              )}
                              {order.status.includes('Pending') && (
                                <button
                                  onClick={() => handleAdminApproveOrder(order.id)}
                                  className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
                                >
                                  <i className="fa-solid fa-circle-check"></i> Approve & Start Delivery
                                </button>
                              )}
                              <a
                                href={whatsappLink(order.phone, `Hello ${order.customer}, regarding your order ${order.id} at UCC.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-1"
                              >
                                <i className="fa-brands fa-whatsapp text-sm"></i> Chat
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ADMIN TAB: INCOMING CONTACT MESSAGES */}
                {adminTab === 'messages' && (
                  <div className="space-y-6 bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-serif font-bold text-xl text-slate-900">Customer Contact Messages</h3>
                        <p className="text-xs text-slate-500 mt-1">Direct inquiries submitted by students from the Contact page.</p>
                      </div>
                      <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                        {messages.length} Messages
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {messages.length === 0 ? (
                        <div className="bg-purple-50/50 p-8 rounded-3xl text-center text-slate-400 border border-purple-100 text-xs font-medium">
                          No direct contact messages received yet.
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div key={msg.id} className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-purple-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-lg">{msg.id}</span>
                                <h4 className="font-bold text-xs text-slate-900">{msg.sender}</h4>
                                <span className="text-[11px] text-slate-400">({msg.phone})</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{msg.time}</span>
                            </div>

                            <p className="text-xs text-slate-700 bg-purple-50/40 p-3 rounded-2xl border border-purple-50 leading-relaxed font-medium">
                              "{msg.text}"
                            </p>

                            <div className="flex justify-end gap-2">
                              <a
                                href={whatsappLink(msg.phone, `Hello ${msg.sender}, responding to your inquiry.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                              >
                                <i className="fa-brands fa-whatsapp"></i> Reply on WhatsApp
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ADMIN TAB: CATALOG MANAGEMENT */}
                {adminTab === 'catalog' && (
                  <div className="space-y-6 bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm">
                    <h3 className="font-serif font-bold text-xl text-slate-900">Manage Store Catalog & Prices</h3>
                    
                    <form onSubmit={handleAddNewProductSubmit} className="bg-white/80 p-6 rounded-3xl border border-rose-100 space-y-4">
                      <h4 className="font-bold text-xs text-rose-700 uppercase tracking-wider">Add New Item to Catalog</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input 
                          type="text"
                          required
                          placeholder="Product Name..."
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 text-xs font-bold bg-white"
                        />
                        <input 
                          type="number"
                          required
                          placeholder="Price (GHâ‚µ)..."
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(e.target.value)}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 text-xs font-bold bg-white"
                        />
                        <select 
                          value={newProdCat}
                          onChange={(e) => setNewProdCat(e.target.value)}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 text-xs font-bold bg-white"
                        >
                          {ALL_CATEGORIES.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input 
                          type="text"
                          placeholder="Description..."
                          value={newProdDesc}
                          onChange={(e) => setNewProdDesc(e.target.value)}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 text-xs bg-white"
                        />
                        <input 
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleMultiImageUpload}
                          className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-500 file:text-white hover:file:bg-rose-600"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow transition"
                      >
                        Upload New Product
                      </button>
                    </form>

                    <div className="space-y-3 pt-2">
                      <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Update Product Prices</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {products.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl border border-rose-100 bg-white">
                            <div className="flex items-center gap-3">
                              <img src={optimizeProductImage(p.mainImage)} loading="lazy" decoding="async" className="w-10 h-10 rounded-xl object-cover" alt="" />
                              <span className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-bold">GHâ‚µ</span>
                              <input 
                                type="number"
                                value={p.price}
                                onChange={(e) => handlePriceChange(p.id, e.target.value)}
                                onBlur={(e) => persistPrice(p.id, e.target.value)}
                                className="w-20 px-2 py-1.5 rounded-lg border border-rose-200 text-xs font-bold text-center"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === 'profile' && (
                  <form onSubmit={saveAdminProfile} className="max-w-2xl space-y-6 rounded-2xl border border-rose-100 bg-white/80 p-6 md:p-8">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-slate-900">Store profile</h3>
                      <p className="mt-1 text-xs text-slate-500">These details and the photo appear on the public About page.</p>
                    </div>
                    <div className="flex flex-col items-center gap-4 border-b border-rose-100 pb-5 sm:flex-row">
                      <img src={adminProfile.avatar} alt={`${adminProfile.name} profile preview`} className="h-24 w-24 rounded-full border-4 border-rose-100 object-cover" />
                      <div className="space-y-2 text-center sm:text-left">
                        <label htmlFor="admin-profile-image" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-50">
                          <i className="fa-solid fa-image"></i> Select profile photo
                        </label>
                        <input id="admin-profile-image" type="file" accept="image/*" onChange={handleProfileImageChange} className="sr-only" />
                        <p className="text-[11px] text-slate-500">Image is resized before upload.</p>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="profile-display-name" className="mb-1 block text-xs font-bold uppercase text-slate-600">Display name</label>
                      <input id="profile-display-name" type="text" required maxLength={80} value={adminProfile.name} onChange={(event) => setAdminProfile({ ...adminProfile, name: event.target.value })} className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm" />
                    </div>
                    <div>
                      <label htmlFor="profile-title" className="mb-1 block text-xs font-bold uppercase text-slate-600">Title</label>
                      <input id="profile-title" type="text" maxLength={140} value={adminProfile.title} onChange={(event) => setAdminProfile({ ...adminProfile, title: event.target.value })} className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm" />
                    </div>
                    <div>
                      <label htmlFor="profile-bio" className="mb-1 block text-xs font-bold uppercase text-slate-600">About</label>
                      <textarea id="profile-bio" rows="4" maxLength={1200} value={adminProfile.bio} onChange={(event) => setAdminProfile({ ...adminProfile, bio: event.target.value })} className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm" />
                    </div>
                    {profileMessage && <p role="status" className="text-xs text-slate-600">{profileMessage}</p>}
                    <button type="submit" disabled={profileSaving} className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white disabled:opacity-60">{profileSaving ? 'Savingâ€¦' : 'Save and publish profile'}</button>
                  </form>
                )}

                {/* ADMIN TAB: CONTACT SETTINGS */}
                {adminTab === 'contact' && (
                  <div className="bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm space-y-6">
                    <h3 className="font-serif font-bold text-xl text-slate-900">Update Admin Contact Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                        <input 
                          type="text"
                          value={adminContact.phone}
                          onChange={(e) => setAdminContact({ ...adminContact, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp Number (e.g. 23324XXXXXXX)</label>
                        <input 
                          type="text"
                          value={adminContact.whatsapp}
                          onChange={(e) => setAdminContact({ ...adminContact, whatsapp: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white"
                        />
                      </div>
                      <button 
                        onClick={() => alert("Contact information updated!")}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow transition"
                      >
                        Save Information
                      </button>
                    </div>
                  </div>
                )}

                {/* ADMIN TAB: CLIENT HANDOVER AND ACCOUNT APPROVALS */}
                {adminTab === 'security' && (
                  <div className="space-y-6">
                    <section className="rounded-2xl border border-rose-100 bg-white/80 p-6 md:p-8 space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700"><Fingerprint size={20} /></span>
                        <div>
                          <h3 className="font-serif font-bold text-xl text-slate-900">Device passkey</h3>
                          <p className="mt-1 text-xs text-slate-600">Set up Face ID, fingerprint, Windows Hello, or your device PIN to unlock the admin dashboard without retyping your password.</p>
                        </div>
                      </div>
                      {adminPasskeys.length > 0 ? (
                        <div className="space-y-2">
                          {adminPasskeys.map(passkey => <p key={passkey.id} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900"><ShieldCheck size={14} className="mr-2 inline" />{passkey.label} registered</p>)}
                          <button onClick={registerAdminPasskey} disabled={passkeyBusy} className="rounded-lg border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800 disabled:opacity-60">{passkeyBusy ? 'Waiting for deviceâ€¦' : 'Add another passkey'}</button>
                        </div>
                      ) : <button onClick={registerAdminPasskey} disabled={passkeyBusy} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-60"><Fingerprint size={17} />{passkeyBusy ? 'Waiting for deviceâ€¦' : 'Set up this device'}</button>}
                      {passkeyMessage && <p role="status" className="text-xs text-slate-600">{passkeyMessage}</p>}
                    </section>

                    <section className="bg-amber-50 p-6 md:p-8 rounded-2xl border border-amber-200 space-y-4">
                      <div>
                        <h3 className="font-serif font-bold text-xl text-slate-900">Client handover</h3>
                        <p className="mt-1 text-xs text-slate-600">Transfer the store owner role to the client. Your account will be downgraded and signed out.</p>
                      </div>
                      <form onSubmit={transferAdmin} className="flex flex-col sm:flex-row gap-3">
                        <input type="email" required placeholder="Client account email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm" />
                        <button type="submit" className="rounded-xl bg-amber-700 px-5 py-3 text-xs font-bold text-white">Transfer admin & logout</button>
                      </form>
                    </section>

                    <section className="bg-white/80 p-6 md:p-8 rounded-2xl border border-rose-100 space-y-4">
                      <h3 className="font-serif font-bold text-xl text-slate-900">Pending accounts</h3>
                      {pendingUsers.length === 0 ? <p className="text-sm text-slate-500">No accounts are waiting for approval.</p> : pendingUsers.map((pendingUser) => (
                        <div key={pendingUser.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-rose-100 pt-3">
                          <div><p className="text-sm font-bold text-slate-900">{pendingUser.name}</p><p className="text-xs text-slate-500">{pendingUser.email}</p></div>
                          <div className="flex gap-2">
                            <button onClick={() => updatePendingUser(pendingUser.id, 'approve')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve</button>
                            <button onClick={() => updatePendingUser(pendingUser.id, 'make-rider')} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Approve rider</button>
                            <button onClick={() => updatePendingUser(pendingUser.id, 'make-admin')} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Make admin</button>
                          </div>
                        </div>
                      ))}
                    </section>
                  </div>
                )}

                {/* ADMIN TAB: CONTENT MANAGER */}
                {adminTab === "content" && (
                  <Suspense fallback={<div className="text-xs text-slate-400 p-4">Loading...</div>}>
                    <ContentManager />
                  </Suspense>
                )}

                {/* ADMIN TAB: USERS */}
                {adminTab === "users" && (
                  <Suspense fallback={<div className="text-xs text-slate-400 p-4">Loading...</div>}>
                    <PendingUsers />
                  </Suspense>
                )}

              </section>

            </div>
            </>
          )}
        </main>
      )}

      {/* FOOTER */}
      <footer className="mt-16 border-t border-rose-100 bg-white/90 px-4 py-9 text-xs text-slate-500">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div><p className="font-serif text-base font-bold text-slate-900">Rabi's Chic Fashion &amp; Campus Essentials</p><p className="mt-2 leading-5">Serving Casely Hayford, Valco, Oguaa, Adehye, and UCC halls with hostel delivery.</p><a href="https://www.instagram.com/rabischic/" target="_blank" rel="noreferrer" className="mt-3 inline-block font-bold text-slate-800">Instagram @rabischic â†—</a></div>
          <div><p className="font-bold uppercase tracking-wider text-slate-800">Help</p><div className="mt-2 flex flex-col items-start gap-2"><button onClick={() => navigateTo('/faq')} className="min-h-9 hover:text-slate-900">FAQ</button><button onClick={() => navigateTo('/faq')} className="min-h-9 hover:text-slate-900">Shipping &amp; Returns</button><button onClick={() => navigateTo('/track')} className="min-h-9 hover:text-slate-900">Track Order</button></div></div>
        <div><p className="font-bold uppercase tracking-wider text-slate-800">Get 10% off your first order</p><p className="mt-2 leading-5">Join the Rabiâ€™s Chic email list for new arrivals and store offers.</p>{newsletterDone ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">Youâ€™re on the list. Use code CHIC10 at checkout.</p> : <form onSubmit={async event => { event.preventDefault(); try { const { data } = await api.post('/newsletter', { email: newsletterEmail }); setNewsletterDone(true); setCheckoutData(current => ({ ...current, email: current.email || newsletterEmail, couponCode: data.couponCode || 'CHIC10' })); } catch (error) { alert(error.response?.data?.detail || 'Could not subscribe. Please try again.'); } }} className="mt-3 flex gap-2"><input type="email" required value={newsletterEmail} onChange={event => setNewsletterEmail(event.target.value)} placeholder="Email address" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-xs" /><button className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white">Join</button></form>}</div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl border-t border-slate-100 pt-4 text-center">Â© {new Date().getFullYear()} Rabi's Chic</p>
      </footer>

      <Onupa products={products} onNavigate={navigateTo} onPickProduct={choosePublicProduct} />
      <WhatsAppButton href={adminWhatsAppHref} />

    </div>
  );
}
