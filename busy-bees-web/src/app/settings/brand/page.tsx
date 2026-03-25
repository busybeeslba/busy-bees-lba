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
        logoCollapsedBase64,
        logoZoom,
        logoCollapsedZoom,
        setPrimaryColor,
        setSidebarBg,
        setLogoBase64,
        setLogoCollapsedBase64,
        setLogoZoom,
        setLogoCollapsedZoom,
        resetToDefaults
    } = useBrand();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const collapsedFileInputRef = useRef<HTMLInputElement>(null);

    // Advanced canvas-based image resizing to bypass LocalStorage limits
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCollapsedLogo: boolean = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Immediately clear the input so the same file can be selected again
        e.target.value = '';

        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                // Dynamically constrain dimensions to prevent localStorage QuotaExceeded errors
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Highly compressed PNG or WebP wrapper bounds the memory cost to <500kb
                const base64String = canvas.toDataURL('image/webp', 0.9);

                if (isCollapsedLogo) {
                    setLogoCollapsedBase64(base64String);
                } else {
                    setLogoBase64(base64String);
                }
            };
            img.src = reader.result as string;
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
                    <h2 className={styles.cardTitle}>Company Logos</h2>
                    <p className={styles.cardDesc}>Upload your company logos. These appear at the top of the sidebar.</p>
                    
                    <div className={styles.logoGrid}>
                        {/* Primary Logo */}
                        <div className={styles.logoUploadRow}>
                            <div className={styles.rowInfo}>
                                <h3>Full Application Logo</h3>
                                <p>Shown when the sidebar is expanded. Best used for wide, horizontal logos featuring your brand text.</p>
                                
                                <div className={styles.uploadControls}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        ref={fileInputRef}
                                        onChange={(e) => handleFileChange(e, false)}
                                        style={{ display: 'none' }}
                                        id="logo-upload"
                                    />
                                    <button 
                                        className={styles.uploadBtn}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={18} />
                                        Browse Image
                                    </button>
                                </div>
                                <div className={styles.zoomControl}>
                                    <label>Zoom Level ({logoZoom}%)</label>
                                    <input 
                                        type="range" 
                                        min="20" 
                                        max="250" 
                                        value={logoZoom}
                                        onChange={(e) => setLogoZoom(parseInt(e.target.value, 10))}
                                    />
                                </div>
                            </div>

                            <div className={styles.currentLogoPreview}>
                                <img 
                                    src={logoBase64 || "/logo.png"} 
                                    alt="Current Full Logo" 
                                    style={{ transform: `scale(${logoZoom / 100})` }}
                                    className={styles.previewImg} 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        {/* Collapsed Logo */}
                        <div className={styles.logoUploadRow}>
                            <div className={styles.rowInfo}>
                                <h3>Collapsed Secondary Icon</h3>
                                <p>Shown when the sidebar is collapsed. Best for a square standalone icon graphic, like an emblem or simplified logo mark.</p>
                                
                                <div className={styles.uploadControls}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        ref={collapsedFileInputRef}
                                        onChange={(e) => handleFileChange(e, true)}
                                        style={{ display: 'none' }}
                                        id="logo-collapsed-upload"
                                    />
                                    <button 
                                        className={styles.uploadBtn}
                                        onClick={() => collapsedFileInputRef.current?.click()}
                                    >
                                        <Upload size={18} />
                                        Browse Icon
                                    </button>
                                </div>
                                <div className={styles.zoomControl}>
                                    <label>Zoom Level ({logoCollapsedZoom}%)</label>
                                    <input 
                                        type="range" 
                                        min="20" 
                                        max="250" 
                                        value={logoCollapsedZoom}
                                        onChange={(e) => setLogoCollapsedZoom(parseInt(e.target.value, 10))}
                                    />
                                </div>
                            </div>
                            
                            <div className={styles.currentLogoPreview} style={{ width: '120px', height: '120px', flex: 'none' }}>
                                <img 
                                    src={logoCollapsedBase64 || "/logo_small.png"} 
                                    alt="Current Collapsed Icon" 
                                    style={{ transform: `scale(${logoCollapsedZoom / 100})` }}
                                    className={styles.previewImg} 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerText = '🐝';
                                        (e.target as HTMLImageElement).parentElement!.style.fontSize = '48px';
                                    }}
                                />
                            </div>
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
