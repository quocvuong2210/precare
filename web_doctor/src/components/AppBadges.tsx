import React from 'react';

interface BadgeProps {
  height?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Official "Download on the App Store" Badge (Apple Brand Guidelines compliant)
 * High-fidelity vector SVG with standard proportions, black background and monochrome Apple logo.
 */
export const AppStoreBadge: React.FC<BadgeProps> = ({
  height = 42,
  onClick,
  style,
  className,
}) => {
  const width = Math.round((height * 138) / 42);

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        display: 'inline-flex',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, opacity 0.15s ease',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
        ...style,
      }}
      title="Tải ứng dụng trên Apple App Store"
      onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 138 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Black background & standard hairline border */}
        <rect width="138" height="42" rx="8" fill="#000000" />
        <rect
          x="0.5"
          y="0.5"
          width="137"
          height="41"
          rx="7.5"
          stroke="#A6A6A6"
          strokeWidth="1"
        />

        {/* Monochrome Apple Logo */}
        <g fill="#FFFFFF">
          {/* Leaf */}
          <path d="M25.8 11.2C25.0 12.2 23.7 12.9 22.5 12.8C22.3 11.6 22.9 10.4 23.6 9.7C24.4 8.7 25.8 8.0 26.8 8.0C27.0 9.3 26.5 10.4 25.8 11.2Z" />
          {/* Apple Silhouette */}
          <path d="M26.8 13.0C24.9 12.9 23.4 14.1 22.5 14.1C21.5 14.1 20.2 13.1 18.7 13.1C16.7 13.1 14.9 14.2 13.9 15.9C11.9 19.4 13.4 24.6 15.3 27.5C16.3 28.9 17.4 30.5 18.9 30.4C20.4 30.3 21.0 29.5 22.7 29.5C24.5 29.5 25.0 30.4 26.5 30.4C28.1 30.4 29.1 28.9 30.1 27.5C31.2 25.9 31.7 24.3 31.7 24.2C31.6 24.1 28.6 23.0 28.6 19.4C28.6 16.4 31.2 15.0 31.3 14.9C29.9 12.8 27.7 12.6 26.8 13.0Z" />
        </g>

        {/* Official Typography */}
        <text
          x="41"
          y="15.5"
          fill="#FFFFFF"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
          fontSize="7.5"
          fontWeight="400"
          letterSpacing="0.2px"
        >
          Download on the
        </text>
        <text
          x="41"
          y="29.5"
          fill="#FFFFFF"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
          fontSize="14.5"
          fontWeight="600"
          letterSpacing="-0.3px"
        >
          App Store
        </text>
      </svg>
    </div>
  );
};

/**
 * Official "GET IT ON Google Play" Badge (Google Brand Guidelines compliant)
 * High-fidelity vector SVG with standard proportions, black background and iconic Google Play triangle.
 */
export const GooglePlayBadge: React.FC<BadgeProps> = ({
  height = 42,
  onClick,
  style,
  className,
}) => {
  const width = Math.round((height * 142) / 42);

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        display: 'inline-flex',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, opacity 0.15s ease',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
        ...style,
      }}
      title="Tải ứng dụng trên Google Play Store"
      onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 142 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Black background & standard hairline border */}
        <rect width="142" height="42" rx="8" fill="#000000" />
        <rect
          x="0.5"
          y="0.5"
          width="141"
          height="41"
          rx="7.5"
          stroke="#A6A6A6"
          strokeWidth="1"
        />

        {/* 4-Color Google Play Triangle Icon */}
        <g transform="translate(13, 9) scale(0.96)">
          {/* Blue / Cyan left triangle */}
          <path
            d="M1.4 1.0C0.9 1.5 0.6 2.3 0.6 3.4V21.6C0.6 22.7 0.9 23.5 1.4 24.0L1.5 24.1L13.5 12.7V12.3L1.5 0.9L1.4 1.0Z"
            fill="#00E5FF"
          />
          {/* Yellow right triangle */}
          <path
            d="M17.5 16.5L13.5 12.5V12.1L17.5 8.1L17.6 8.2L22.4 10.9C23.7 11.6 23.7 12.9 22.4 13.6L17.6 16.4L17.5 16.5Z"
            fill="#FFC400"
          />
          {/* Red bottom triangle */}
          <path
            d="M17.6 16.4L13.5 12.3L1.4 24.1C1.9 24.5 2.6 24.6 3.4 24.1L17.6 16.4Z"
            fill="#FF3D00"
          />
          {/* Green top triangle */}
          <path
            d="M17.6 8.2L3.4 0.4C2.6 -0.1 1.9 0.0 1.4 0.5L13.5 12.3L17.6 8.2Z"
            fill="#00E676"
          />
        </g>

        {/* Official Typography */}
        <text
          x="42"
          y="15.5"
          fill="#FFFFFF"
          fontFamily="Roboto, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          fontSize="7.0"
          fontWeight="500"
          letterSpacing="0.6px"
        >
          GET IT ON
        </text>
        <text
          x="42"
          y="29.5"
          fill="#FFFFFF"
          fontFamily="'Product Sans', Roboto, -apple-system, BlinkMacSystemFont, Arial, sans-serif"
          fontSize="14.0"
          fontWeight="600"
          letterSpacing="-0.2px"
        >
          Google Play
        </text>
      </svg>
    </div>
  );
};

