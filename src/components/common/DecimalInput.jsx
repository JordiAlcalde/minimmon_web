import React, { useState, useEffect } from 'react';
import { parseDecimal, formatDecimalInput } from '../../utils/numberUtils';

/**
 * Component d'entrada de text per a nombres decimals.
 * Interpreta i mostra el punt decimal com a coma (,) de forma flexible.
 */
export function DecimalInput({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  className = '',
  placeholder = '',
  disabled = false,
  readOnly = false,
  min,
  max,
  step = 0.5,
  decimals = null,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  // Sincronitzar amb el prop value extern quan el camp no té el focus
  useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null || value === '') {
        setLocalValue('');
      } else {
        setLocalValue(formatDecimalInput(value, decimals));
      }
    }
  }, [value, isFocused, decimals]);

  const handleChange = (e) => {
    let rawStr = e.target.value;

    // Convertir qualsevol punt (.) en coma (,)
    rawStr = rawStr.replace(/\./g, ',');

    // Validar que només hi hagi dígits, un signe menys al principi i com a màxim una coma
    const regex = /^-?\d*,?\d*$/;
    if (rawStr !== '' && !regex.test(rawStr)) {
      return; // Ignorar entrades no vàlides
    }

    setLocalValue(rawStr);

    const parsedNum = parseDecimal(rawStr);

    if (onChange) {
      // Crear un esdeveniment sintètic compatible amb handlers existents (e.target.value)
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: rawStr,
          valueAsNumber: parsedNum,
        },
      };
      onChange(syntheticEvent, parsedNum);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentNum = parseDecimal(localValue) || 0;
      const stepVal = step ? parseFloat(step) : 0.5;
      let nextNum = e.key === 'ArrowUp' ? currentNum + stepVal : currentNum - stepVal;
      
      if (min !== undefined && nextNum < Number(min)) nextNum = Number(min);
      if (max !== undefined && nextNum > Number(max)) nextNum = Number(max);

      // Evitar imprecisions de coma flotant JavaScript (ex: 0.5000000000000001)
      const precision = stepVal.toString().includes('.') ? stepVal.toString().split('.')[1].length : 2;
      nextNum = Math.round(nextNum * Math.pow(10, precision)) / Math.pow(10, precision);

      const formatted = formatDecimalInput(nextNum, decimals);
      setLocalValue(formatted);

      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: formatted,
            valueAsNumber: nextNum,
          },
        };
        onChange(syntheticEvent, nextNum);
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    
    // Al sortir del camp, si s'ha posat min o max, aplicar validacions
    let num = parseDecimal(localValue);
    if (localValue !== '' && !isNaN(num)) {
      if (min !== undefined && num < Number(min)) num = Number(min);
      if (max !== undefined && num > Number(max)) num = Number(max);
      
      const formatted = formatDecimalInput(num, decimals);
      setLocalValue(formatted);
    }

    if (onBlur) onBlur(e);
  };

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={isFocused ? localValue : (value !== undefined && value !== null && value !== '' ? formatDecimalInput(value, decimals) : localValue)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder ? formatDecimalInput(placeholder, decimals) : ''}
      className={className}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

export default DecimalInput;
