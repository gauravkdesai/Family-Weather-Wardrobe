import React, { useState } from 'react';
import { TrashIcon } from './icons';
import { FamilyMember } from '../types';

interface FamilyConfigModalProps {
  family: FamilyMember[];
  setFamily: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  onClose: () => void;
}

const FamilyConfigModal: React.FC<FamilyConfigModalProps> = ({ family, setFamily, onClose }) => {
  const [newMember, setNewMember] = useState('');

  const handleAddMember = () => {
    if (newMember.trim() && family.length < 10) { // Limit to 10 members
      setFamily([...family, { name: newMember.trim(), pinned: false }]);
      setNewMember('');
    }
  };

  const handleRemoveMember = (index: number) => {
    setFamily(family.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-lg m-4 text-slate-800 dark:text-slate-200" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-800 dark:text-slate-100">Configure Your Family</h2>
        
        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
          {family.map((member, index) => (
            <div key={index} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
              <span className="font-medium">{member.name}</span>
              <button
                onClick={() => handleRemoveMember(index)}
                className="text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                aria-label={`Remove ${member.name}`}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
          {family.length === 0 && (
              <p className="text-center text-slate-500 dark:text-slate-400 py-4">Add family members to get started!</p>
          )}
        </div>

        <div className="flex gap-3 items-center mb-6">
          <input
            type="text"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember(); }}
            placeholder="e.g., 'Teenager', 'Toddler'"
            className="flex-grow px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddMember}
            className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
          >
            Add
          </button>
        </div>
        
        <div className="text-center">
            <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-3 bg-slate-600 text-white font-bold rounded-full hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-offset-slate-800"
            >
                Done
            </button>
        </div>
      </div>
       <style>{`
          .animate-fade-in-fast {
            animation: fadeIn 0.2s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
    </div>
  );
};

export default FamilyConfigModal;