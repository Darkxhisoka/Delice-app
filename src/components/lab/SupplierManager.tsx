import React, { useState, useEffect } from 'react';
import { getSuppliers, addSupplier, subscribeToStoreChanges, notifyToast } from '../../services/storage';
import { Supplier } from '../../types';
import { Building, Mail, Phone, Plus, Tag, Search, ShieldCheck } from 'lucide-react';

export const SupplierManager: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Supplier Form
  const [name, setName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [categoriesStr, setCategoriesStr] = useState<string>('Flour & Grains');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30 Days');

  useEffect(() => {
    const load = () => {
      setSuppliers(getSuppliers());
    };
    load();
    return subscribeToStoreChanges(load);
  }, []);

  const filtered = suppliers.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.contactPerson.toLowerCase().includes(term) ||
      s.categoriesProvided.some((c) => c.toLowerCase().includes(term))
    );
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSup = addSupplier({
      name: name.trim(),
      contactPerson: contactPerson.trim() || 'Accounts Manager',
      email: email.trim() || 'contact@supplier.com',
      phone: phone.trim() || 'N/A',
      categoriesProvided: categoriesStr.split(',').map((c) => c.trim()),
      paymentTerms,
    });

    notifyToast({
      type: 'success',
      title: 'Supplier Added',
      message: `${newSup.name} is now available in raw material purchasing.`,
    });

    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Approved Raw Material Suppliers</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of verified vendors supplying central lab ingredients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search supplier or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sup) => (
          <div key={sup.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{sup.name}</h4>
                  <p className="text-xs text-slate-500">Contact: {sup.contactPerson}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {sup.paymentTerms}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{sup.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{sup.phone}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
              {sup.categoriesProvided.map((cat, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Approved Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Supplier Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Normandy Creamery Co."
                  className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Marc Dubois"
                    className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Net 60 Days">Net 60 Days</option>
                    <option value="Prepaid">Prepaid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="orders@vendor.com"
                    className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categories Supplied (comma separated)</label>
                <input
                  type="text"
                  value={categoriesStr}
                  onChange={(e) => setCategoriesStr(e.target.value)}
                  placeholder="e.g. Fats & Oils, Dairy & Eggs"
                  className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
