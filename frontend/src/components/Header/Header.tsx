import React from "react";
import styles from "./Header.module.css";

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <img 
          src="/logo.png" 
          alt="Logo" 
          className={styles.logo}
        />
      </div>
    </header>
  );
};

export default React.memo(Header);
