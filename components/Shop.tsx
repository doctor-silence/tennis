
import React, { useState } from 'react';
import { ShoppingBag, Search, Filter, Star, Plus, Minus, X, ArrowLeft, Heart, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import { Product, CartItem } from '../types';

interface ShopProps {
  onBack: () => void;
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    title: 'Wilson Blade 98 v8',
    category: 'rackets',
    price: 24990,
    image: 'https://images.unsplash.com/photo-1617083934555-52951271b273?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviews: 124,
    isHit: true
  },
  {
    id: '2',
    title: 'Babolat Pure Aero 2023',
    category: 'rackets',
    price: 26500,
    oldPrice: 28900,
    image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    reviews: 89,
    isNew: true
  },
  {
    id: '3',
    title: 'Nike Court Zoom Vapor',
    category: 'shoes',
    price: 14990,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    reviews: 56
  },
  {
    id: '4',
    title: 'Asics Gel-Resolution 9',
    category: 'shoes',
    price: 16200,
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviews: 42
  },
  {
    id: '5',
    title: 'Head Tour Balls (3 pcs)',
    category: 'accessories',
    price: 890,
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop',
    rating: 5.0,
    reviews: 312
  },
  {
    id: '6',
    title: 'TennisPro Dry-Fit T-Shirt',
    category: 'apparel',
    price: 2490,
    oldPrice: 3500,
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    reviews: 28
  },
  {
    id: '7',
    title: 'Yonex EZONE 98',
    category: 'rackets',
    price: 25900,
    image: 'https://images.unsplash.com/photo-1530915512336-3603260636aa?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    reviews: 67
  },
  {
    id: '8',
    title: 'Wilson Pro Overgrip (12pk)',
    category: 'accessories',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1628105663784-0775363364f9?q=80&w=800&auto=format&fit=crop',
    rating: 4.9,
    reviews: 156
  }
];

const Shop: React.FC<ShopProps> = ({ onBack }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'Все товары' },
    { id: 'rackets', label: 'Ракетки' },
    { id: 'shoes', label: 'Кроссовки' },
    { id: 'apparel', label: 'Одежда' },
    { id: 'accessories', label: 'Аксессуары' }
  ];

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    setItemToRemove(null);
  };

  const removeFromCart = (id: string) => {
    setItemToRemove(id);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-slate-50 min-h-screen relative">
      {/* Черно-белый фильтр и оверлей */}
      <div className="absolute inset-0 z-50 pointer-events-none" style={{ filter: 'grayscale(100%)' }}>
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="text-center space-y-8">
            <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tight text-black">
              Скоро<br />открытие
            </h1>
            <p className="text-2xl text-slate-700 font-medium">
              Магазин НаКорте скоро откроется
            </p>
            <div className="w-32 h-1 bg-black mx-auto"></div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-medium text-sm rounded-full hover:bg-black transition-all"
            >
              <ArrowLeft size={16} />
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>

      {/* Основной контент магазина с grayscale фильтром */}
      <div style={{ filter: 'grayscale(100%)' }}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 transition-colors"><ArrowLeft size={20}/></button>
             <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span className="font-black tracking-wider">НаКорте</span> <span className="text-lime-500">Shop</span>
             </h1>
           </div>
           
           <div className="flex-1 max-w-md mx-8 hidden md:block relative">
              <input 
                 className="w-full bg-slate-100 border-none rounded-full py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-lime-400"
                 placeholder="Найти ракетку, кроссовки..."
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
           </div>

           <button onClick={() => setIsCartOpen(true)} className="relative p-2 hover:bg-slate-100 rounded-full transition-colors group">
              <ShoppingBag size={24} className="text-slate-700 group-hover:text-lime-600 transition-colors"/>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-lime-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                </span>
              )}
           </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
         {/* Categories & Filter */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
             <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
                 {categories.map(cat => (
                     <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                            activeCategory === cat.id 
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                            : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                        }`}
                     >
                         {cat.label}
                     </button>
                 ))}
             </div>
             <button className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-white px-4 py-2.5 rounded-full border border-slate-200 hover:text-slate-900 md:w-auto w-full justify-center">
                 <Filter size={16}/> Фильтры
             </button>
         </div>

         {/* Product Grid */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
            {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group relative">
                    {product.isNew && <span className="absolute top-4 left-4 bg-lime-400 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-full uppercase z-10">New</span>}
                    {product.isHit && <span className="absolute top-4 left-4 bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-full uppercase z-10">Hit</span>}
                    
                    <button className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:text-red-500 text-slate-400">
                        <Heart size={18} />
                    </button>

                    <div className="h-48 bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
                        <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.title} />
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between items-start mb-1">
                             <h3 className="font-bold text-slate-900 leading-tight flex-1 pr-2">{product.title}</h3>
                             <div className="flex items-center gap-1 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                                 <Star size={10} className="fill-amber-400 text-amber-400"/> {product.rating}
                             </div>
                        </div>
                        <p className="text-xs text-slate-500 capitalize">{product.category}</p>
                    </div>

                    <div className="flex items-center justify-between">
                         <div>
                             {product.oldPrice && <div className="text-xs text-slate-400 line-through font-medium">{product.oldPrice.toLocaleString()} ₽</div>}
                             <div className="text-lg font-bold text-slate-900">{product.price.toLocaleString()} ₽</div>
                         </div>
                         <button 
                            onClick={() => addToCart(product)}
                            className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white hover:bg-lime-500 transition-colors shadow-lg shadow-slate-900/20"
                         >
                             <Plus size={20}/>
                         </button>
                    </div>
                </div>
            ))}
         </div>
      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-fade-in-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">Корзина <span className="text-slate-400 text-sm font-normal">({cartCount})</span></h2>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length > 0 ? cart.map(item => (
                        <div key={item.id} className="flex gap-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                                <img src={item.image} className="w-full h-full object-cover" alt={item.title}/>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h4>
                                <div className="text-sm font-bold text-slate-500 mb-3">{item.price.toLocaleString()} ₽</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border border-slate-200 rounded-lg h-8">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="px-2 hover:bg-slate-50 h-full border-r border-slate-200"><Minus size={14}/></button>
                                        <span className="px-3 text-sm font-bold">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="px-2 hover:bg-slate-50 h-full border-l border-slate-200"><Plus size={14}/></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-xs text-red-400 hover:text-red-500 font-medium underline">Удалить</button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <ShoppingBag size={64} className="mb-4 opacity-20"/>
                            <p>Корзина пуста</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsCartOpen(false)}>Перейти к покупкам</Button>
                        </div>
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500">Итого:</span>
                            <span className="text-2xl font-bold text-slate-900">{cartTotal.toLocaleString()} ₽</span>
                        </div>
                        <Button className="w-full">Оформить заказ</Button>
                    </div>
                )}
            </div>
        </div>
      )}

        {itemToRemove && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-sm m-4">
                    <h3 className="text-lg font-bold text-slate-900">Подтвердите удаление</h3>
                    <p className="text-slate-500 mt-2 mb-6">Вы уверены, что хотите удалить этот товар из корзины?</p>
                    <div className="flex justify-end gap-4">
                        <Button variant="outline" onClick={() => setItemToRemove(null)}>Отмена</Button>
                        <Button variant="danger" onClick={() => handleRemoveFromCart(itemToRemove)}>Удалить</Button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
