'use client';

import React, { useRef } from 'react';
import { useBrand } from '@/context/BrandContext';
import { Upload, RotateCcw, Palette } from 'lucide-react';
import styles from './BrandSettings.module.css';

export default function BrandSettingsPage() {
    const {
        primaryColor,
        sidebarBg,
        logoBase64,
        setPrimaryColor,
        setSidebarBg,
        setLogoBase64,
        resetToDefaults
    } = useBrand();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (e.g., max 2MB to avoid huge base64 strings)
        if (file.size > 2 * 1024 * 1024) {
            alert('File too large. Please upload an image under 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setLogoBase64(base64String);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Brand Settings</h1>
                <p className={styles.subtitle}>Customize the look and feel of the dashboard.</p>
                <div className={styles.headerActions}>
                    <button onClick={resetToDefaults} className={styles.resetBtn}>
                        <RotateCcw size={16} />
                        Reset to Defaults
                    </button>
                </div>
            </header>

            <div className={styles.content}>
                {/* Logo Upload Section */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Company Logo</h2>
                    <p className={styles.cardDesc}>Upload your company logo. This will appear at the top of the sidebar.</p>
                    
                    <div className={styles.logoUploadArea}>
                        <div className={styles.currentLogoPreview}>
                            <img 
                                src={logoBase64 || "/logo.png"} 
                                alt="Current Logo" 
                                className={styles.previewImg} 
                                onError={(e) => {
                                    // Fallback if no logo.png exists yet
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                        
                        <div className={styles.uploadControls}>
                            <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                id="logo-upload"
                            />
                            <button 
                                className={styles.uploadBtn}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={18} />
                                Upload New Logo
                            </button>
                            <span className={styles.uploadHint}>Recommended: Transparent PNG, max 2MB.</span>
                        </div>
                    </div>
                </section>

                {/* Color Palette Section */}
                <section className={styles.card}>
                    <div className={styles.cardHeaderWithIcon}>
                        <Palette size={20} className={styles.cardIcon} />
                        <h2 className={styles.cardTitle}>Color Palette</h2>
                    </div>
                    <p className={styles.cardDesc}>Customize the primary accent colors throughout the application.</p>
                    
                    <div className={styles.colorGrid}>
                        <div className={styles.colorControl}>
                            <label htmlFor="primary-color" className={styles.colorLabel}>Primary Color</label>
                            <div className={styles.colorInputWrapper}>
                                <input 
                                    type="color" 
                                    id="primary-color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className={styles.colorPicker}
                                />
                                <input 
                                    type="text" 
                                    value={primaryColor.toUpperCase()}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className={styles.hexInput}
                                    placeholder="#5CE1E6"
                                />
                            </div>
                            <span className={styles.colorHint}>Used for buttons, active states, and highlights.</span>
                        </div>

                        <div className={styles.colorControl}>
                            <label htmlFor="sidebar-bg" className={styles.colorLabel}>Sidebar Background</label>
                            <div className={styles.colorInputWrapper}>
                                <input 
                                    type="color" 
                                    id="sidebar-bg"
                                    value={sidebarBg}
                                    onChange={(e) => setSidebarBg(e.target.value)}
                                    className={styles.colorPicker}
                                />
                                <input 
                                    type="text" 
                                    value={sidebarBg.toUpperCase()}
                                    onChange={(e) => setSidebarBg(e.target.value)}
                                    className={styles.hexInput}
                                    placeholder="#5CE1E6"
                                />
                            </div>
                            <span className={styles.colorHint}>The background color of the left navigation sidebar.</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
