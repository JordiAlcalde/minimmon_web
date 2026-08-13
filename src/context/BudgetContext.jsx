import React, { createContext, useContext, useState, useEffect } from 'react';

const BudgetContext = createContext();

const CART_STORAGE_KEY = 'minimmon_budget_cart';
const SENT_BUDGET_COUNT_KEY = 'minimmon_sent_budget_count';

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

  const [sentBudgetCount, setSentBudgetCount] = useState(() => {
    try {
      const saved = localStorage.getItem(SENT_BUDGET_COUNT_KEY);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const recordSentBudget = () => {
    setSentBudgetCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(SENT_BUDGET_COUNT_KEY, next.toString());
      } catch (e) {}
      return next;
    });
  };

  // Desem a localStorage cada vegada que canvia la cistella
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("Error desant la cistella a localStorage:", e);
    }
  }, [cart]);

  // Afegir un element a la cistella de pressupostos
  const addToCart = (newItem) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.producteId === newItem.producteId && JSON.stringify(item.opcionsTriades) === JSON.stringify(newItem.opcionsTriades)
      );

      if (existingIdx > -1) {
        // Actualitzem quantitat i fusionem observacions si n'hi ha
        const updated = [...prevCart];
        const currentItem = updated[existingIdx];
        updated[existingIdx] = {
          ...currentItem,
          quantitat: currentItem.quantitat + (newItem.quantitat || 1),
          observacions: newItem.observacions ? newItem.observacions : currentItem.observacions
        };
        return updated;
      }

      // Nou element
      const cartItem = {
        cartItemId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        producteId: newItem.producteId,
        nom: newItem.nom,
        imatge: newItem.imatge || '',
        quantitat: newItem.quantitat || 1,
        observacions: newItem.observacions || '',
        opcionsTriades: newItem.opcionsTriades || {},
        terminiFabricacio: newItem.terminiFabricacio || ''
      };

      return [...prevCart, cartItem];
    });

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

  return (
    <BudgetContext.Provider
      value={{
        cart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        totalItems,
        sentBudgetCount,
        recordSentBudget,
        isDrawerOpen,
        setIsDrawerOpen
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error("useBudget ha d'utilitzar-se dins d'un BudgetProvider");
  }
  return context;
}
