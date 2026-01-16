import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './NotFound.module.css';

const NotFound = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/");
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate("/");
    }
  };

  return (
    <div className={styles.notfound} style={{backgroundImage: 'url(/images/MainVisual/background.png)'}}>
      <div className={styles.inner}>
        <p className={styles.num}>404</p>
        <p>HỆ THỐNG ĐANG BẢO TRÌ VUI LÒNG QUAY TRỞ LẠI SAU!</p>
        <p 
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={styles.button}
          tabIndex={0}
          role="button"
          aria-label="Navigate to home page"
        >
          Trang chủ
        </p>
      </div>
    </div>
  );
};

export default NotFound;

