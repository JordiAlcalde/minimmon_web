import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const BudgetContext = createContext();

const CART_STORAGE_KEY = 'minimmon_budget_cart';
const USER_ORDERS_STORAGE_KEY = 'minimmon_user_orders';

export function BudgetProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("No s'ha pogut carregar la cistella de pressupostos des de localStorage:", e);
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('cart'); // 'cart' | 'tracking'
  const [selectedTrackingRef, setSelectedTrackingRef] = useState('');

  // Llista de comandes/pressupostos realitzats o seguits en aquest navegador
  const [userOrders, setUserOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_ORDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("No s'han pogut carregar les comandes de l'usuari des de localStorage:", e);
      return [];
    }
  });

  // Dades en temps real de Firestore per a les comandes del client
  const [liveOrdersMap, setLiveOrdersMap] = useState({});

  // Desem a localStorage cada vegada que canvia la cistella
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("Error desant la cistella a localStorage:", e);
    }
  }, [cart]);

  // Desem a localStorage cada vegada que canvien les comandes de l'usuari
  useEffect(() => {
    try {
      localStorage.setItem(USER_ORDERS_STORAGE_KEY, JSON.stringify(userOrders));
    } catch (e) {
      console.warn("Error desant comandes a localStorage:", e);
    }
  }, [userOrders]);

  // Sincronització en temps real amb Firestore per a les referències guardades
  useEffect(() => {
    if (!userOrders || userOrders.length === 0) {
      setLiveOrdersMap({});
      return;
    }

    const refCodes = userOrders.map(o => o.refCode).filter(Boolean);
    if (refCodes.length === 0) return;

    // Firestore admet fins a 30 valors a un 'in' query; si en tenim més, agafem els 30 més recents
    const targetRefs = refCodes.slice(0, 30);
    const q = query(collection(db, "pressupostos"), where("codiReferencia", "in", targetRefs));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedMap = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.codiReferencia) {
          updatedMap[data.codiReferencia] = {
            id: docSnap.id,
            ...data
          };
        }
      });
      setLiveOrdersMap(updatedMap);
    }, (err) => {
      console.warn("Error escoltant comandes actives a Firestore:", err);
    });

    return () => unsubscribe();
  }, [userOrders]);

  // Afegir o recordar una comanda
  const saveUserOrder = (orderInfo) => {
    if (!orderInfo || !orderInfo.refCode) return;
    setUserOrders((prev) => {
      const exists = prev.find(o => o.refCode === orderInfo.refCode);
      if (exists) {
        return prev.map(o => o.refCode === orderInfo.refCode ? { ...o, ...orderInfo } : o);
      }
      return [{ ...orderInfo, timestamp: Date.now() }, ...prev];
    });
  };

  // Eliminar una comanda de la memòria local
  const removeUserOrder = (refCode) => {
    setUserOrders((prev) => prev.filter(o => o.refCode !== refCode));
  };

  // Càlcul de comandes actives (en curs, que no estiguin finalitzades ni cancel·lades)
  const enrichedOrders = userOrders.map(order => {
    const live = liveOrdersMap[order.refCode];
    return {
      ...order,
      ...(live || {}),
      // Si encara no tenim resposta de Firestore, usem l'estat guardat inicialment
      estatComanda: live?.estatComanda || order.estatComanda || 'rebuda',
      estat: live?.estat || order.estat || 'pendent'
    };
  });

  const activeOrders = enrichedOrders.filter(o => {
    const estatComanda = o.estatComanda || 'rebuda';
    const estat = o.estat || 'pendent';
    return estatComanda !== 'lliurat' && estat !== 'cancel·lada' && estat !== 'rebutjat';
  });

  const activeOrdersCount = activeOrders.length;
  const hasActiveOrders = activeOrdersCount > 0;

  // Afegir un element a la cistella de pressupostos
  const addToCart = (newItem) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.producteId === newItem.producteId && JSON.stringify(item.opcionsTriades) === JSON.stringify(newItem.opcionsTriades)
      );

      const parsedPrice = typeof newItem.preuUnitari === 'number' 
        ? newItem.preuUnitari 
        : (newItem.preuUnitari ? parseFloat(newItem.preuUnitari) : null);

      if (existingIdx > -1) {
        const updated = [...prevCart];
        const currentItem = updated[existingIdx];
        updated[existingIdx] = {
          ...currentItem,
          quantitat: currentItem.quantitat + (newItem.quantitat || 1),
          observacions: newItem.observacions ? newItem.observacions : currentItem.observacions,
          preuUnitari: parsedPrice !== null ? parsedPrice : currentItem.preuUnitari,
          preuBase: newItem.preuBase !== undefined ? newItem.preuBase : currentItem.preuBase,
          sobrecost: newItem.sobrecost !== undefined ? newItem.sobrecost : currentItem.sobrecost,
          isBudgetRequired: newItem.isBudgetRequired !== undefined ? newItem.isBudgetRequired : currentItem.isBudgetRequired
        };
        return updated;
      }

      const cartItem = {
        cartItemId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        producteId: newItem.producteId,
        nom: newItem.nom,
        imatge: newItem.imatge || '',
        quantitat: newItem.quantitat || 1,
        observacions: newItem.observacions || '',
        opcionsTriades: newItem.opcionsTriades || {},
        preuUnitari: parsedPrice,
        preuBase: newItem.preuBase || null,
        sobrecost: newItem.sobrecost || null,
        isBudgetRequired: Boolean(newItem.isBudgetRequired),
        terminiFabricacio: newItem.terminiFabricacio || ''
      };

      return [...prevCart, cartItem];
    });

    setActiveDrawerTab('cart');
    setIsDrawerOpen(true);
  };

  const updateCartItem = (cartItemId, updates) => {
    setCart((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, ...updates } : item))
    );
  };

  const removeFromCart = (cartItemId) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {}
  };

  const totalItems = cart.reduce((acc, item) => acc + (item.quantitat || 1), 0);

  const openCart = () => {
    setActiveDrawerTab('cart');
    setIsDrawerOpen(true);
  };

  const openTrackingDrawer = (ref = '') => {
    if (ref) setSelectedTrackingRef(ref);
    setActiveDrawerTab('tracking');
    setIsDrawerOpen(true);
  };

  return (
    <BudgetContext.Provider
      value={{
        cart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        totalItems,
        isDrawerOpen,
        setIsDrawerOpen,
        activeDrawerTab,
        setActiveDrawerTab,
        selectedTrackingRef,
        setSelectedTrackingRef,
        userOrders: enrichedOrders,
        activeOrders,
        activeOrdersCount,
        hasActiveOrders,
        saveUserOrder,
        removeUserOrder,
        openCart,
        openTrackingDrawer
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget ha de ser utilitzat dins de BudgetProvider');
  }
  return context;
}
