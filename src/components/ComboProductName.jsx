import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

export default function ComboProductName({ value, onChange, placeholder = "Select from list or type item name", className = "" }) {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.name || "");
  const wrapperRef = useRef(null);

  useEffect(() => {
    api.get('/products').then(({ data }) => {
      setProducts(data);
      setFiltered(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (value?.name) {
      setInputValue(value.name);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const filteredList = products.filter(p =>
      p.name.toLowerCase().includes(val.toLowerCase()) ||
      p.category.toLowerCase().includes(val.toLowerCase())
    );
    setFiltered(filteredList);
    setIsOpen(true);
  };

  const handleSelect = (product) => {
    setInputValue(product.name);
    setIsOpen(false);
    onChange({
      name: product.name,
      price: product.price,
      id: product.id,
      isCustom: false
    });
  };

  const handleBlur = () => {
    // Small delay to allow onClick to fire
    setTimeout(() => {
      if (inputValue && !products.find(p => p.name === inputValue)) {
        onChange({
          name: inputValue,
          price: 0, // Will trigger manual price input in parent
          id: null,
          isCustom: true
        });
      }
    }, 200);
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white focus:outline-none focus:border-rose-500 transition"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-rose-100 bg-white shadow-xl py-1">
          {filtered.map(product => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelect(product)}
              className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 transition flex justify-between items-center"
            >
              <span className="font-medium text-slate-800">{product.name}</span>
              <span className="text-rose-600 font-bold">GH₵{product.price}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
