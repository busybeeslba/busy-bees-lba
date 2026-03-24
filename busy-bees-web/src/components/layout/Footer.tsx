'use client';

import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <span>© {currentYear} Busy Bees LBA. All rights reserved.</span>
            <div className={styles.links}>
                <Link href="#" className={styles.link}>Privacy Policy</Link>
                <Link href="#" className={styles.link}>Terms of Service</Link>
            </div>
        </footer>
    );
}
