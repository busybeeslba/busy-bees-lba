
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './AddServiceModal.module.css';

interface AddServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: any) => void;
    initialData?: { serviceId: string, name: string, provider?: string } | null;
    existingServices?: any[];
}

export default function AddServiceModal({ isOpen, onClose, onSave, initialData, existingServices }: AddServiceModalProps) {
    const [serviceId, setServiceId] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [serviceDescription, setServiceDescription] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setErrorMessage('');
            if (initialData) {
                setServiceId(initialData.serviceId);
                setServiceName(initialData.name);
                setServiceDescription(initialData.provider || ''); // Mapped from legacy provider data
            } else {
                // Generate a random ID like SRV-1234
                setServiceId(`SRV-${Math.floor(1000 + Math.random() * 9000)}`);
                setServiceName('');
                setServiceDescription('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!initialData && existingServices) {
            const serviceExists = existingServices.some(s =>
                s.name.toLowerCase() === serviceName.trim().toLowerCase()
            );
            if (serviceExists) {
                setErrorMessage('Service with this name already exists');
                return;
            }
        }

        onSave({
            serviceId,
            clientId: 'Unassigned',
            childName: 'Unassigned',
            type: serviceName,
            hours: 'TBD',
            description: serviceDescription.trim(),
        });
        onClose();
    };


    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                    <X size={24} />
                </button>

                <h2 className={styles.title}>{initialData ? 'Edit Service' : 'Add New Service'}</h2>

                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Service ID</label>
                        <input
                            type="text"
                            value={serviceId}
                            className={`${styles.input} ${styles.readOnlyInput} `}
                            disabled
                            title="Auto-generated Service ID"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Service Name</label>
                        <input
                            type="text"
                            value={serviceName}
                            onChange={(e) => { setServiceName(e.target.value); setErrorMessage(''); }}
                            className={`${styles.input} ${errorMessage ? styles.inputError : ''}`}
                            placeholder="e.g. ABA Therapy"
                            required
                        />
                        {errorMessage && <span className={styles.errorMessage}>{errorMessage}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Service Description</label>
                        <textarea
                            value={serviceDescription}
                            onChange={(e) => setServiceDescription(e.target.value)}
                            className={styles.input}
                            placeholder="Add an optional description for this service"
                            rows={3}
                        />
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.saveBtn} disabled={!serviceName.trim()}>
                            {initialData ? 'Save Changes' : 'Save Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
