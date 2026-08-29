import React, { createContext, useContext, useState, useEffect } from 'react';

const BudgetContext = createContext();

const CART_STORAGE_KEY = 'minimmon_budget_cart';

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

      const parsedPrice = typeof newItem.preuUnitari === 'number' 
        ? newItem.preuUnitari 
        : (newItem.preuUnitari ? parseFloat(newItem.preuUnitari) : null);

      if (existingIdx > -1) {
        // Actualitzem quantitat i fusionem observacions si n'hi ha
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

      // Nou element
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
