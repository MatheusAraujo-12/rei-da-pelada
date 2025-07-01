import React from 'react';

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onClose }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm border border-yellow-500/30">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">{title}</h3>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors">Cancelar</button>
                    <button onClick={onConfirm} className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;