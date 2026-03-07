import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';

// --- TYPES ---
export type ActiveScreen = 'home' | 'menu' | 'links' | 'about' | 'user_management' | 'history' | 'profile';
export type TransactionType = 'income' | 'expense' | 'dues' | 'attendance';

export interface User {
    id: string;
    username: string;
    password?: string;
    status: 'pending' | 'approved';
    role: 'admin' | 'user';
}

export interface Income {
    id: string;
    date: string;
    name: string;
    enteredBy: string;
    type: string;
    item: string;
    receiptCount: number;
    amount: number;
    comment: string;
}

export interface Expense {
    id: string;
    date: string;
    name: string;
    enteredBy: string;
    type: string;
    item: string;
    payeeName: string;
    amount: number;
    comment: string;
}

export interface Dues {
    id: string;
    debtorName: string;
    item: string;
    amount: number;
    dueDate: string;
    enteredBy: string;
}

export interface Attendance {
    id: string;
    name: string;
    employeeId: string;
    date: string;
    status: 'উপস্থিত' | 'অনুপস্থিত';
    enteredBy: string;
}

export interface LinkItem {
    id: string;
    title: string;
    url: string;
}

// --- COMPONENTS ---

// Header Component
const Header: React.FC<{ title: string; onMenuOpen: () => void; user: User; onProfileClick: () => void }> = ({ title, onMenuOpen, user, onProfileClick }) => {
  const openNewTab = () => window.open(window.location.href, '_blank');
  const isIframe = window.self !== window.top;
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-30">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onMenuOpen} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <i className="fas fa-bars text-xl"></i>
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-none">{title}</h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={openNewTab} className={`p-2 rounded-lg transition-all flex items-center space-x-2 ${isIframe ? 'bg-blue-600 text-white hover:bg-blue-700 px-3' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700'}`}>
            <i className="fas fa-up-right-from-square"></i>
            {isIframe && <span className="text-xs font-bold hidden xs:inline">ফুল স্ক্রিন</span>}
          </button>
          <div onClick={onProfileClick} className="flex items-center space-x-3 cursor-pointer group">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold group-hover:text-blue-600 transition-colors">{user.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.role === 'admin' ? 'এডমিন' : 'ব্যবহারকারী'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold border-2 border-white dark:border-gray-700 group-hover:border-blue-500 transition-all">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// SideMenu Component
const SideMenu: React.FC<{ isOpen: boolean; onClose: () => void; activeScreen: ActiveScreen; onScreenChange: (screen: ActiveScreen) => void; isAdmin: boolean; onLogout: () => void }> = ({ isOpen, onClose, activeScreen, onScreenChange, isAdmin, onLogout }) => {
  const menuItems = [
    { id: 'home', label: 'হোম ড্যাশবোর্ড', icon: 'fa-house' },
    { id: 'profile', label: 'আমার প্রোফাইল', icon: 'fa-user-circle' },
    { id: 'menu', label: 'এন্ট্রি ফরম', icon: 'fa-pen-to-square' },
    { id: 'history', label: 'লেনদেনের ইতিহাস', icon: 'fa-clock-rotate-left' },
    { id: 'links', label: 'দরকারি লিংক', icon: 'fa-link' },
    { id: 'about', label: 'আমাদের সম্পর্কে', icon: 'fa-circle-info' },
  ];
  if (isAdmin) menuItems.splice(4, 0, { id: 'user_management', label: 'ইউজার কন্ট্রোল', icon: 'fa-users-gear' });
  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 z-50 transform transition-transform duration-300 ease-out shadow-2xl flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white"><i className="fas fa-layer-group"></i></div>
            <span className="text-xl font-bold tracking-tight">RGO ড্যাশবোর্ড</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><i className="fas fa-xmark text-xl"></i></button>
        </div>
        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { onScreenChange(item.id as ActiveScreen); onClose(); }} className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all ${activeScreen === item.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
              <div className="w-8 flex justify-center"><i className={`fas ${item.icon} text-lg`}></i></div>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onLogout} className="w-full flex items-center space-x-4 p-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-semibold">
            <div className="w-8 flex justify-center"><i className="fas fa-right-from-bracket"></i></div>
            <span>লগআউট</span>
          </button>
        </div>
      </aside>
    </>
  );
};

// --- SCREENS ---

// StatCard Component
const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => {
  const colorMap: Record<string, string> = { green: 'bg-green-500 text-green-500', red: 'bg-red-500 text-red-500', amber: 'bg-amber-500 text-amber-500', blue: 'bg-blue-500 text-blue-500' };
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
      <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-5 ${colorMap[color].split(' ')[0]}`}></div>
      <div className="flex flex-col space-y-3 relative">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-opacity-10 ${colorMap[color]}`}><i className={`fas ${icon} text-lg`}></i></div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-xl font-black mt-1 tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
};

// HomeScreen Component
const HomeScreen: React.FC<{ totals: { totalIncome: number; totalExpense: number; totalDues: number; currentCash: number }; incomes: Income[]; expenses: Expense[]; currentUser: User; onProfileClick: () => void }> = ({ totals, incomes, expenses, currentUser, onProfileClick }) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('bn-BD', { style: 'currency', currency: 'BDT' }).format(amount);
  const isAdmin = currentUser.role === 'admin';
  const chartData = [
    { name: 'আয়', value: totals.totalIncome, color: '#10b981' },
    { name: 'ব্যয়', value: totals.totalExpense, color: '#ef4444' },
    { name: 'বকেয়া', value: totals.totalDues, color: '#f59e0b' },
  ];
  const recentActivities = [...incomes, ...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-black mb-2">স্বাগতম, {currentUser.username}!</h2>
          <p className="opacity-90 font-medium">{isAdmin ? 'প্রতিষ্ঠানের পূর্ণ নিয়ন্ত্রণ আপনার হাতে।' : 'আপনার ব্যক্তিগত এন্ট্রিগুলো এখানে সংরক্ষিত।'}</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <button onClick={() => window.open(window.location.href, '_blank')} className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-bold transition-all flex items-center border border-white/20">
            <i className="fas fa-up-right-from-square mr-2"></i>ফুল স্ক্রিন
          </button>
          <button onClick={onProfileClick} className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-bold transition-all flex items-center">
            <i className="fas fa-user-circle mr-2"></i>প্রোফাইল
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={isAdmin ? "মোট আয় (সবাই)" : "আমার মোট আয়"} value={formatCurrency(totals.totalIncome)} icon="fa-money-bill-trend-up" color="green" />
        <StatCard title={isAdmin ? "মোট ব্যয় (সবাই)" : "আমার মোট ব্যয়"} value={formatCurrency(totals.totalExpense)} icon="fa-receipt" color="red" />
        <StatCard title={isAdmin ? "মোট বকেয়া" : "আমার বকেয়া"} value={formatCurrency(totals.totalDues)} icon="fa-hourglass-half" color="amber" />
        <StatCard title="বর্তমান ক্যাশ" value={formatCurrency(totals.currentCash)} icon="fa-wallet" color="blue" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-6 flex items-center"><i className="fas fa-chart-bar mr-3 text-blue-500"></i>লেনদেন বিশ্লেষণ {isAdmin ? '(গ্লোবাল)' : '(ব্যক্তিগত)'}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-6 flex items-center"><i className="fas fa-clock-rotate-left mr-3 text-indigo-500"></i>সাম্প্রতিক লেনদেন</h3>
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${'receiptCount' in tx ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <i className={`fas ${'receiptCount' in tx ? 'fa-plus' : 'fa-minus'} text-[10px]`}></i>
                  </div>
                  <div>
                    <p className="font-semibold text-xs line-clamp-1">{tx.item}</p>
                    <p className="text-[10px] text-gray-400">{isAdmin ? `By: ${tx.enteredBy}` : new Date(tx.date).toLocaleDateString('bn-BD')}</p>
                  </div>
                </div>
                <p className={`font-bold text-xs ${'receiptCount' in tx ? 'text-green-600' : 'text-red-600'}`}>{tx.amount}</p>
              </div>
            )) : <p className="text-center py-10 text-gray-400 text-xs">কোনো লেনদেন নেই</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// TransactionForm Component
const TransactionForm: React.FC<{ type: TransactionType; onSubmit: (data: any) => void; username: string }> = ({ type, onSubmit, username }) => {
  const [formData, setFormData] = useState<any>({ name: username, type: '', item: '', amount: '', comment: '', receiptCount: 1, payeeName: '', employeeId: '', status: 'উপস্থিত', debtorName: '', dueDate: new Date().toISOString().split('T')[0] });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processedData = { ...formData };
    if (processedData.amount) processedData.amount = parseFloat(processedData.amount);
    if (processedData.receiptCount) processedData.receiptCount = parseInt(processedData.receiptCount);
    onSubmit(processedData);
  };
  return (
    <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(type === 'income' || type === 'expense' || type === 'dues') && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">লেনদেনের আইটেম</label>
            <input name="item" required value={formData.item} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none" placeholder="কি বাবদ?" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">টাকার পরিমাণ</label>
            <input name="amount" type="number" required value={formData.amount} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-mono" placeholder="0.00" />
          </div>
        </>
      )}
      {type === 'income' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">আয়ের ধরন</label>
            <input name="type" required value={formData.type} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="সার্ভিস/পণ্য" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">রিসিট সংখ্যা</label>
            <input name="receiptCount" type="number" value={formData.receiptCount} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </>
      )}
      {type === 'expense' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">খরচের ধরন</label>
            <input name="type" required value={formData.type} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="নাস্তা/বিল/ভাড়া" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">গ্রহীতার নাম</label>
            <input name="payeeName" required value={formData.payeeName} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="কার কাছে জমা?" />
          </div>
        </>
      )}
      {type === 'attendance' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">কর্মচারীর নাম</label>
            <input name="name" required value={formData.name} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">আইডি নম্বর</label>
            <input name="employeeId" required value={formData.employeeId} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">উপস্থিতি স্ট্যাটাস</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="উপস্থিত">উপস্থিত</option>
              <option value="অনুপস্থিত">অনুপস্থিত</option>
            </select>
          </div>
        </>
      )}
      {type === 'dues' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">দেনাদারের নাম</label>
            <input name="debtorName" required value={formData.debtorName} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">পরিশোধের শেষ তারিখ</label>
            <input name="dueDate" type="date" required value={formData.dueDate} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
          </div>
        </>
      )}
      <div className="md:col-span-2 space-y-2">
        <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">মন্তব্য (ঐচ্ছিক)</label>
        <textarea name="comment" rows={3} value={formData.comment} onChange={handleChange} className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="অতিরিক্ত তথ্য থাকলে লিখুন..."></textarea>
      </div>
      <div className="md:col-span-2 pt-4">
        <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/20 transform transition-all active:scale-[0.98]">তথ্য জমা দিন <i className="fas fa-paper-plane ml-2"></i></button>
      </div>
    </form>
  );
};

const MenuScreen: React.FC<{ onAddTransaction: (type: TransactionType, data: any) => void; currentUser: User }> = ({ onAddTransaction, currentUser }) => {
  const [activeForm, setActiveForm] = useState<TransactionType | null>(null);
  const menuItems: { id: TransactionType; label: string; icon: string; color: string; desc: string }[] = [
    { id: 'income', label: 'আয় বা ইনকাম', icon: 'fa-circle-plus', color: 'bg-green-500', desc: 'অফিসের সকল আয়ের হিসাব লিখুন' },
    { id: 'expense', label: 'খরচ বা ব্যয়', icon: 'fa-circle-minus', color: 'bg-red-500', desc: 'দৈনন্দিন খরচের বিবরণ জমা দিন' },
    { id: 'attendance', label: 'হাজিরা বা উপস্থিতি', icon: 'fa-user-check', color: 'bg-indigo-500', desc: 'কর্মকর্তাদের হাজিরা এন্ট্রি করুন' },
    { id: 'dues', label: 'বকেয়া বা পাওনা', icon: 'fa-file-invoice-dollar', color: 'bg-amber-500', desc: 'বকেয়া লেনদেনের হিসাব রাখুন' },
  ];
  if (activeForm) {
    return (
      <div className="animate-slideUp">
        <button onClick={() => setActiveForm(null)} className="mb-6 flex items-center text-gray-500 hover:text-blue-600 font-bold transition-colors"><i className="fas fa-arrow-left mr-2"></i>মেনুতে ফিরে যান</button>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold flex items-center"><i className={`fas ${menuItems.find(i => i.id === activeForm)?.icon} mr-3 text-blue-500`}></i>{menuItems.find(i => i.id === activeForm)?.label} এন্ট্রি ফরম</h2>
          </div>
          <div className="p-8"><TransactionForm type={activeForm} onSubmit={(data) => { onAddTransaction(activeForm, data); setActiveForm(null); }} username={currentUser.username} /></div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
      {menuItems.map((item) => (
        <button key={item.id} onClick={() => setActiveForm(item.id)} className="group flex items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900 transition-all text-left">
          <div className={`w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center text-white text-2xl shadow-lg transition-transform group-hover:scale-110`}><i className={`fas ${item.icon}`}></i></div>
          <div className="ml-6 flex-grow">
            <h3 className="text-xl font-bold mb-1 group-hover:text-blue-600 transition-colors">{item.label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
          </div>
          <div className="text-gray-300 group-hover:text-blue-500 transition-colors"><i className="fas fa-chevron-right"></i></div>
        </button>
      ))}
    </div>
  );
};

const LinksScreen: React.FC<{ links: LinkItem[]; onAddLink: (link: Partial<LinkItem>) => void; isAdmin: boolean }> = ({ links, onAddLink, isAdmin }) => {
  const defaultLinks = [
    { title: 'অফিসিয়াল ওয়েবসাইট', url: 'https://rgo.com.bd', icon: 'fa-globe', color: 'bg-blue-500' },
    { title: 'ফেসবুক পেজ', url: 'https://facebook.com/rgo', icon: 'fa-facebook-f', color: 'bg-indigo-600' },
    { title: 'ইউটিউব চ্যানেল', url: 'https://youtube.com/rgo', icon: 'fa-youtube', color: 'bg-red-600' },
    { title: 'সাপোর্ট পোর্টাল', url: 'https://support.rgo.com.bd', icon: 'fa-headset', color: 'bg-emerald-500' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fadeIn">
      {defaultLinks.map((link, idx) => (
        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="group flex items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900 transition-all">
          <div className={`w-14 h-14 rounded-xl ${link.color} flex items-center justify-center text-white text-xl shadow-lg transition-transform group-hover:rotate-12`}><i className={`fab ${link.icon} ${link.icon.startsWith('fa-') ? 'fas' : ''}`}></i></div>
          <div className="ml-5 flex-grow">
            <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">{link.title}</h3>
            <p className="text-xs text-gray-400 font-mono mt-1">{link.url.replace('https://', '')}</p>
          </div>
          <div className="text-gray-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1"><i className="fas fa-external-link-alt"></i></div>
        </a>
      ))}
    </div>
  );
};

const AboutScreen: React.FC<{ onBackup: () => void; onRestore: (file: File) => void; isAdmin: boolean }> = ({ onBackup, onRestore, isAdmin }) => (
  <div className="max-w-3xl mx-auto animate-fadeIn">
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-10 text-center space-y-6">
        <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white text-5xl shadow-2xl shadow-blue-500/40"><i className="fas fa-layer-group"></i></div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter">RGO ড্যাশবোর্ড</h2>
          <p className="text-blue-600 dark:text-blue-400 font-black tracking-widest uppercase text-xs">ভার্সন ২.০.৪ (স্টেবল)</p>
        </div>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-lg">এটি একটি আধুনিক এন্টারপ্রাইজ রিসোর্স ম্যানেজমেন্ট সিস্টেম। প্রতিষ্ঠানের দৈনন্দিন আয়-ব্যয়, হাজিরা এবং বকেয়া হিসাব অত্যন্ত স্বচ্ছতার সাথে পরিচালনা করার জন্য এটি তৈরি করা হয়েছে।</p>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <button onClick={onBackup} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center"><i className="fas fa-download mr-2"></i>ব্যাকআপ নিন</button>
            <label className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center cursor-pointer">
              <i className="fas fa-upload mr-2"></i>রিস্টোর করুন
              <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && onRestore(e.target.files[0])} />
            </label>
          </div>
        )}
        <div className="pt-8 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ডেভেলপার</p><p className="font-bold">RGO টেক টিম</p></div>
          <div className="space-y-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">টেকনোলজি</p><p className="font-bold">React + Tailwind</p></div>
          <div className="space-y-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">আপডেট</p><p className="font-bold">২০ মে, ২০২৪</p></div>
        </div>
      </div>
    </div>
  </div>
);

const UserManagementScreen: React.FC<{ users: User[]; onUpdateUser: (id: string, updates: Partial<User>) => void; onDeleteUser: (id: string) => void }> = ({ users, onUpdateUser, onDeleteUser }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn">
    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-700/30">
      <h2 className="text-xl font-bold flex items-center"><i className="fas fa-users-cog mr-3 text-blue-500"></i>ইউজার ম্যানেজমেন্ট</h2>
      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">মোট {users.length} জন</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase tracking-widest"><th className="p-4 font-black">ইউজারনেম</th><th className="p-4 font-black">রোল</th><th className="p-4 font-black">স্ট্যাটাস</th><th className="p-4 font-black text-right">অ্যাকশন</th></tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="p-4"><div className="flex items-center space-x-3"><div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs">{user.username.charAt(0)}</div><span className="font-bold text-sm">{user.username}</span></div></td>
              <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{user.role}</span></td>
              <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{user.status === 'approved' ? 'অনুমোদিত' : 'পেন্ডিং'}</span></td>
              <td className="p-4 text-right space-x-2">
                {user.status === 'pending' && <button onClick={() => onUpdateUser(user.id, { status: 'approved' })} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-lg shadow-green-500/20" title="অনুমোদন দিন"><i className="fas fa-check"></i></button>}
                {user.role !== 'admin' && <button onClick={() => onUpdateUser(user.id, { role: 'admin' })} className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors shadow-lg shadow-purple-500/20" title="এডমিন বানান"><i className="fas fa-user-shield"></i></button>}
                <button onClick={() => onDeleteUser(user.id)} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg shadow-red-500/20" title="ডিলিট করুন"><i className="fas fa-trash"></i></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// HistoryScreen Component
const HistoryScreen: React.FC<{ incomes: Income[]; expenses: Expense[]; attendances: Attendance[]; dues: Dues[]; currentUser: User; isAdmin: boolean; onUpdateStatus?: (type: TransactionType, id: string, status: string) => void }> = ({ incomes, expenses, attendances, dues, currentUser, isAdmin, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<TransactionType>('income');
  const filterData = (data: any[]) => isAdmin ? data : data.filter(item => item.enteredBy === currentUser.username);
  const renderTable = () => {
    switch (activeTab) {
      case 'income':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase tracking-widest"><th className="p-4 font-black">তারিখ</th><th className="p-4 font-black">আইটেম</th><th className="p-4 font-black">পরিমাণ</th><th className="p-4 font-black">রিসিট</th>{isAdmin && <th className="p-4 font-black">এন্ট্রি বাই</th>}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filterData(incomes).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 text-sm font-medium">{new Date(item.date).toLocaleDateString('bn-BD')}</td>
                    <td className="p-4 text-sm font-bold">{item.item}</td>
                    <td className="p-4 text-sm font-black text-green-600">{item.amount}</td>
                    <td className="p-4 text-sm font-mono">{item.receiptCount}</td>
                    {isAdmin && <td className="p-4 text-xs font-bold text-blue-500">{item.enteredBy}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'expense':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase tracking-widest"><th className="p-4 font-black">তারিখ</th><th className="p-4 font-black">আইটেম</th><th className="p-4 font-black">পরিমাণ</th><th className="p-4 font-black">গ্রহীতা</th>{isAdmin && <th className="p-4 font-black">এন্ট্রি বাই</th>}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filterData(expenses).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 text-sm font-medium">{new Date(item.date).toLocaleDateString('bn-BD')}</td>
                    <td className="p-4 text-sm font-bold">{item.item}</td>
                    <td className="p-4 text-sm font-black text-red-600">{item.amount}</td>
                    <td className="p-4 text-sm font-medium">{item.payeeName}</td>
                    {isAdmin && <td className="p-4 text-xs font-bold text-blue-500">{item.enteredBy}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'attendance':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase tracking-widest"><th className="p-4 font-black">তারিখ</th><th className="p-4 font-black">নাম</th><th className="p-4 font-black">আইডি</th><th className="p-4 font-black">স্ট্যাটাস</th>{isAdmin && <th className="p-4 font-black">এন্ট্রি বাই</th>}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filterData(attendances).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 text-sm font-medium">{new Date(item.date).toLocaleDateString('bn-BD')}</td>
                    <td className="p-4 text-sm font-bold">{item.name}</td>
                    <td className="p-4 text-sm font-mono">{item.employeeId}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'উপস্থিত' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{item.status}</span></td>
                    {isAdmin && <td className="p-4 text-xs font-bold text-blue-500">{item.enteredBy}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'dues':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase tracking-widest"><th className="p-4 font-black">তারিখ</th><th className="p-4 font-black">আইটেম</th><th className="p-4 font-black">পরিমাণ</th><th className="p-4 font-black">দেনাদার</th><th className="p-4 font-black">স্ট্যাটাস</th>{isAdmin && <th className="p-4 font-black">অ্যাকশন</th>}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filterData(dues).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 text-sm font-medium">{new Date(item.date).toLocaleDateString('bn-BD')}</td>
                    <td className="p-4 text-sm font-bold">{item.item}</td>
                    <td className="p-4 text-sm font-black text-amber-600">{item.amount}</td>
                    <td className="p-4 text-sm font-medium">{item.debtorName}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{item.status === 'paid' ? 'পরিশোধিত' : 'বকেয়া'}</span></td>
                    {isAdmin && (
                      <td className="p-4">
                        {item.status === 'unpaid' && (
                          <button onClick={() => onUpdateStatus?.('dues', item.id, 'paid')} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-lg shadow-green-500/20"><i className="fas fa-check"></i></button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default: return null;
    }
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn">
      <div className="flex bg-gray-50 dark:bg-gray-700/50 p-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar">
        {(['income', 'expense', 'attendance', 'dues'] as TransactionType[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-600 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
            {tab === 'income' ? 'আয়' : tab === 'expense' ? 'ব্যয়' : tab === 'attendance' ? 'হাজিরা' : 'বকেয়া'}
          </button>
        ))}
      </div>
      {renderTable()}
    </div>
  );
};

// ProfileScreen Component
const ProfileScreen: React.FC<{ user: User; incomes: Income[]; expenses: Expense[]; attendances: Attendance[]; dues: Dues[] }> = ({ user, incomes, expenses, attendances, dues }) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('bn-BD', { style: 'currency', currency: 'BDT' }).format(amount);
  const totals = useMemo(() => {
    const totalIncome = incomes.filter(i => i.enteredBy === user.username).reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = expenses.filter(i => i.enteredBy === user.username).reduce((sum, i) => sum + i.amount, 0);
    const totalDues = dues.filter(i => i.enteredBy === user.username).reduce((sum, i) => sum + i.amount, 0);
    return { totalIncome, totalExpense, totalDues, currentCash: totalIncome - totalExpense };
  }, [incomes, expenses, dues, user]);

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6">
            <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-3xl p-2 shadow-xl mx-auto">
              <div className="w-full h-full bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 text-5xl font-black uppercase">{user.username.charAt(0)}</div>
            </div>
            <div className="absolute bottom-0 right-1/2 translate-x-16 bg-green-500 w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center text-white text-[10px]"><i className="fas fa-check"></i></div>
          </div>
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-black tracking-tight">{user.username}</h2>
            <div className="flex items-center justify-center space-x-2">
              <span className="px-4 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-widest">{user.role}</span>
              <span className="px-4 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-black uppercase tracking-widest">{user.status}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatItem label="মোট আয়" value={formatCurrency(totals.totalIncome)} color="text-green-600" />
            <StatItem label="মোট ব্যয়" value={formatCurrency(totals.totalExpense)} color="text-red-600" />
            <StatItem label="বকেয়া" value={formatCurrency(totals.totalDues)} color="text-amber-600" />
            <StatItem label="ক্যাশ" value={formatCurrency(totals.currentCash)} color="text-blue-600" />
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">ইউজার আইডি</p>
              <p className="font-mono text-sm font-bold">{user.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-sm font-black ${color}`}>{value}</p>
  </div>
);

// AuthContainer Component
const AuthContainer: React.FC<{ users: User[]; onLogin: (user: User) => void; onRegister: (user: User) => void }> = ({ users, onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (isLogin) {
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        if (user.status === 'approved') onLogin(user);
        else setError('আপনার প্রোফাইলটি এখনও অনুমোদিত হয়নি। অনুগ্রহ করে এডমিনের অনুমোদনের জন্য অপেক্ষা করুন।');
      } else setError('ভুল ইউজারনেম অথবা পাসওয়ার্ড। অনুগ্রহ করে সঠিক তথ্য দিন।');
    } else {
      if (users.find(u => u.username === username)) { setError('এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি নাম ব্যবহার করুন।'); return; }
      const newUser: User = { id: Math.random().toString(36).substr(2, 9), username, password, status: 'pending', role: 'user' };
      onRegister(newUser);
      setSuccess('রেজিস্ট্রেশন সফল হয়েছে! এডমিন অনুমোদন দিলে আপনি লগইন করতে পারবেন।');
      setUsername(''); setPassword(''); setIsLogin(true);
    }
  };
  const isIframe = window.self !== window.top;
  const openNewTab = () => window.open(window.location.href, '_blank');
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700">
      <div className="max-w-md w-full animate-fadeIn">
        {isIframe && (
          <div className="mb-6 flex justify-center">
            <button onClick={openNewTab} className="px-6 py-3 bg-white/20 backdrop-blur-xl text-white rounded-2xl font-bold hover:bg-white/30 transition-all flex items-center space-x-3 shadow-xl">
              <i className="fas fa-up-right-from-square"></i><span>নতুন ট্যাবে খুলুন</span>
            </button>
          </div>
        )}
        <div className="text-center mb-10 space-y-3">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl mx-auto flex items-center justify-center text-white text-4xl shadow-2xl"><i className="fas fa-layer-group"></i></div>
          <h1 className="text-4xl font-black text-white tracking-tighter">RGO ড্যাশবোর্ড</h1>
          <p className="text-blue-100 text-lg opacity-80">প্রতিষ্ঠানের ডিজিটাল ডায়েরি</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl space-y-8">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${isLogin ? 'bg-white dark:bg-gray-600 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>লগইন করুন</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${!isLogin ? 'bg-white dark:bg-gray-600 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>নতুন অ্যাকাউন্ট</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">ইউজারনেম</label>
              <div className="relative">
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="আপনার নাম দিন" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">পাসওয়ার্ড</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="পাসওয়ার্ড দিন" />
              </div>
            </div>
            {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-4 rounded-xl text-sm font-bold flex items-center space-x-3"><i className="fas fa-circle-exclamation text-lg"></i><p>{error}</p></div>}
            {success && <div className="bg-green-50 dark:bg-green-900/20 text-green-500 p-4 rounded-xl text-sm font-bold flex items-center space-x-3"><i className="fas fa-circle-check text-lg"></i><p>{success}</p></div>}
            <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-500/30 transform transition-all active:scale-[0.98] mt-4">
              {isLogin ? 'অ্যাপে প্রবেশ করুন' : 'অ্যাকাউন্ট খুলুন'}<i className="fas fa-arrow-right ml-3"></i>
            </button>
          </form>
        </div>
        {isLogin && <div className="mt-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white text-center text-sm font-medium"><p className="opacity-80">লগইন ডেমো: ইউজার <b>admin</b> পাসওয়ার্ড <b>password</b></p></div>}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dues, setDues] = useState<Dues[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('ড্যাশবোর্ড');

  // Firebase Real-time Listeners
  useEffect(() => {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      if (data.length === 0) {
        // Bootstrap admin if no users exist
        const adminId = 'admin-1';
        setDoc(doc(db, 'users', adminId), { 
          id: adminId, 
          username: 'admin', 
          password: 'password', 
          status: 'approved', 
          role: 'admin' 
        });
      }
      setUsers(data);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'incomes'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Income)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'dues'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setDues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dues)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'attendances'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setAttendances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'links'));
    return onSnapshot(q, (snapshot) => {
      setLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LinkItem)));
    });
  }, []);

  // Role-based data filtering
  const filteredData = useMemo(() => {
    const isAdmin = currentUser?.role === 'admin';
    const filter = <T extends { enteredBy: string }>(arr: T[]) => 
      isAdmin ? arr : arr.filter(item => item.enteredBy === currentUser?.username);

    return {
      incomes: filter(incomes),
      expenses: filter(expenses),
      dues: filter(dues),
      attendances: filter(attendances)
    };
  }, [incomes, expenses, dues, attendances, currentUser]);

  const totals = useMemo(() => {
    const totalIncome = filteredData.incomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredData.expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalDues = filteredData.dues.reduce((sum, item) => sum + item.amount, 0);
    return { totalIncome, totalExpense, totalDues, currentCash: totalIncome - totalExpense };
  }, [filteredData]);

  useEffect(() => {
    switch (activeScreen) {
      case 'home': setHeaderTitle('ড্যাশবোর্ড'); break;
      case 'menu': setHeaderTitle('এন্ট্রি ফরম'); break;
      case 'links': setHeaderTitle('লিংক সমূহ'); break;
      case 'about': setHeaderTitle('ব্যাকআপ ও সাপোর্ট'); break;
      case 'history': setHeaderTitle('লেনদেনের ইতিহাস'); break;
      case 'user_management': setHeaderTitle('ইউজার কন্ট্রোল'); break;
      case 'profile': setHeaderTitle('আমার প্রোফাইল'); break;
    }
  }, [activeScreen]);

  const handleAddTransaction = useCallback(async (type: TransactionType, data: any) => {
    if (!currentUser) return;
    const entryData = { ...data, enteredBy: currentUser.username, date: new Date().toISOString() };

    try {
      switch (type) {
        case 'income': await addDoc(collection(db, 'incomes'), entryData); break;
        case 'expense': await addDoc(collection(db, 'expenses'), entryData); break;
        case 'dues': await addDoc(collection(db, 'dues'), { ...entryData, status: 'unpaid' }); break;
        case 'attendance': await addDoc(collection(db, 'attendances'), entryData); break;
      }
    } catch (error) {
      console.error("Error adding transaction: ", error);
      alert("তথ্য জমা দিতে সমস্যা হয়েছে।");
    }
  }, [currentUser]);

  const handleUpdateStatus = async (type: TransactionType, id: string, status: string) => {
    if (type === 'dues') {
      try {
        await updateDoc(doc(db, 'dues', id), { status });
      } catch (error) {
        console.error("Error updating status: ", error);
      }
    }
  };

  const handleBackup = () => {
    const backupData = { users, incomes, expenses, dues, attendances, links };
    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rgo_backup_${new Date().toLocaleDateString()}.json`;
    link.click();
  };

  const handleRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.users) setUsers(data.users);
        if (data.incomes) setIncomes(data.incomes);
        if (data.expenses) setExpenses(data.expenses);
        if (data.dues) setDues(data.dues);
        if (data.attendances) setAttendances(data.attendances);
        if (data.links) setLinks(data.links);
        alert('সফলভাবে ডেটা রিস্টোর করা হয়েছে!');
      } catch (err) {
        alert('ফাইলটি সঠিক নয়।');
      }
    };
    reader.readAsText(file);
  };

  if (!currentUser) {
    return <AuthContainer users={users} onLogin={setCurrentUser} onRegister={async (u) => {
      try {
        await setDoc(doc(db, 'users', u.id), u);
      } catch (error) {
        console.error("Error registering user: ", error);
      }
    }} />;
  }

  const renderScreen = () => {
    const isAdmin = currentUser.role === 'admin';
    switch (activeScreen) {
      case 'home': return <HomeScreen totals={totals} incomes={filteredData.incomes} expenses={filteredData.expenses} currentUser={currentUser} onProfileClick={() => setActiveScreen('profile')} />;
      case 'menu': return <MenuScreen onAddTransaction={handleAddTransaction} currentUser={currentUser} />;
      case 'links': return <LinksScreen links={links} onAddLink={async (l) => {
        try {
          await addDoc(collection(db, 'links'), { title: l.title || '', url: l.url || '' });
        } catch (error) {
          console.error("Error adding link: ", error);
        }
      }} isAdmin={isAdmin} />;
      case 'about': return <AboutScreen onBackup={handleBackup} onRestore={handleRestore} isAdmin={isAdmin} />;
      case 'history': return <HistoryScreen incomes={filteredData.incomes} expenses={filteredData.expenses} dues={filteredData.dues} attendances={filteredData.attendances} isAdmin={isAdmin} currentUser={currentUser} onUpdateStatus={handleUpdateStatus} />;
      case 'user_management': return isAdmin ? <UserManagementScreen users={users} onUpdateUser={async (id, updates) => {
        try {
          await updateDoc(doc(db, 'users', id), updates);
        } catch (error) {
          console.error("Error updating user: ", error);
        }
      }} onDeleteUser={async (id) => {
        try {
          await deleteDoc(doc(db, 'users', id));
        } catch (error) {
          console.error("Error deleting user: ", error);
        }
      }} /> : null;
      case 'profile': return <ProfileScreen user={currentUser} incomes={incomes} expenses={expenses} attendances={attendances} dues={dues} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header title={headerTitle} onMenuOpen={() => setIsSideMenuOpen(true)} user={currentUser} onProfileClick={() => setActiveScreen('profile')} />
      <SideMenu isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} activeScreen={activeScreen} onScreenChange={setActiveScreen} isAdmin={currentUser.role === 'admin'} onLogout={() => setCurrentUser(null)} />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-5xl">{renderScreen()}</main>
    </div>
  );
};

export default App;
