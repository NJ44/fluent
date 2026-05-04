"use client";
import React, { useMemo } from "react";

interface WaveButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
}

function getRandomId() {
  return Math.random().toString(36).substring(2, 8);
}

export const WaveButton: React.FC<WaveButtonProps> = ({
  children,
  onClick,
  type = "button",
  className = "",
  borderRadius = "12px",
  width = "200px",
  height = "52px",
}) => {
  const uid = useMemo(() => getRandomId(), []);

  return (
    <button
      type={type}
      className={`wave-btn-base ${className} wave-btn-${uid}`}
      onClick={onClick}
      style={{ borderRadius, width, height } as React.CSSProperties}
    >
      <div className="wave-layer" />
      <div className="wave-layer" />
      <div className="wave-layer" />
      <div className="wave-layer" />
      <div className="wave-bubble" />
      <div className="wave-bubble" />
      <div className="wave-bubble" />
      <div className="wave-bubble" />
      <span className="wave-btn-text">{children}</span>

      <style>{`
        .wave-btn-base {
          display: flex;
          z-index: 0;
          justify-content: center;
          align-items: center;
          position: relative;
          overflow: hidden;
          background: #0a1520;
          box-shadow: 0 0 12px rgba(0,0,0,.45), 0 0 8px rgba(0,0,0,.25) inset;
          transition: all ease .7s;
          border: none;
          cursor: pointer;
          margin: 0 5px;
        }
        .wave-btn-base::before {
          content: '';
          position: absolute;
          z-index: 6;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: linear-gradient(rgba(0,25,85,0) 60%, rgba(0,25,85,.4));
        }
        .wave-layer {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          filter: drop-shadow(0 0 3px rgba(10, 60, 90, 0.8));
        }
        .wave-layer:nth-child(1) { z-index: 1; }
        .wave-layer:nth-child(2) { z-index: 2; }
        .wave-layer:nth-child(3) { z-index: 3; }
        .wave-layer:nth-child(4) { z-index: 5; }

        .wave-layer:nth-child(1)::before, .wave-layer:nth-child(1)::after {
          content: '';
          position: absolute;
          width: 120px; height: 65px;
          background: #0d2a4a;
          clip-path: path('M140.44,0c-12.81,1.3-12.59,12.11-35.96,10.7-14.56-.88-16.21,19.13-40.12,10.57-17.84-6.39-37.9-1.86-49.13,10.03C2.01,45.31,3.29,51.05,0,65.19H140.44V0Z');
          animation: wb-wave1 linear 3s infinite alternate;
        }
        .wave-layer:nth-child(1)::before, .wave-layer:nth-child(2)::before,
        .wave-layer:nth-child(3)::before, .wave-layer:nth-child(4)::before {
          transform: rotate(180deg); transition: all ease 4.4s;
        }
        .wave-layer:nth-child(1)::after, .wave-layer:nth-child(2)::after,
        .wave-layer:nth-child(3)::after, .wave-layer:nth-child(4)::after {
          transition: all ease 4.4s;
        }
        .wave-layer:nth-child(1)::before { top: -16px; left: -16px; }
        .wave-layer:nth-child(2)::before { top: -20px; left: -20px; }
        .wave-layer:nth-child(3)::before { top: -20px; left: -20px; }
        .wave-layer:nth-child(4)::before { top: -20px; left: -20px; }
        .wave-layer:nth-child(1)::after  { bottom: -16px; right: -16px; }
        .wave-layer:nth-child(2)::after  { bottom: -20px; right: -20px; }
        .wave-layer:nth-child(3)::after  { bottom: -20px; right: -20px; }
        .wave-layer:nth-child(4)::after  { bottom: -20px; right: -20px; }

        .wave-layer:nth-child(2)::before, .wave-layer:nth-child(2)::after {
          content: ''; position: absolute;
          width: 139px; height: 61px;
          background: #0e3a5e;
          clip-path: path('M137.15,.03c-16.75-.44-27.29,4.77-33.69,10.72-6.4,5.96-24.52,19.73-43.08,9.17-13.1-7.46-26.74-3.14-38.25,4.78C6.61,35.38,3.74,44.74,0,59.63H137.15V.03Z');
          animation: wb-wave2 linear 3s infinite alternate;
        }
        .wave-layer:nth-child(3)::before, .wave-layer:nth-child(3)::after {
          content: ''; position: absolute;
          width: 134px; height: 56px;
          background: #0f4a70;
          clip-path: path('M132.61,0c-9.18,3.92-11.29,5.2-19.97,4.19-9.33-1.09-10.97,12.29-25.37,15.53-9.69,2.18-17.12-7.15-28.89-5.37-15.68,2.38-16.35,7.79-29.01,9.38C4.37,26.86-.79,50.3,.09,54.49H132.61V0Z');
          animation: wb-wave3 linear 3s infinite alternate;
        }
        .wave-layer:nth-child(4)::before, .wave-layer:nth-child(4)::after {
          content: ''; position: absolute;
          width: 129px; height: 47px;
          background: #0d5a80;
          clip-path: path('M128.7,.2c-16.75-.44-23.99-.69-30.39,5.26-6.4,5.96-8.68,12.19-26.99,7.33-9.6-2.54-24.02-4.44-34.16,2.33-10.83,7.23-14.87,9.49-22.83,10.33C1.59,26.81-.72,39.73,.17,43.92H128.7V.2Z');
          animation: wb-wave4 linear 3s infinite alternate;
        }

        .wave-btn-text {
          position: relative;
          z-index: 7;
          display: inline-block;
          font-size: 15px;
          letter-spacing: 2px;
          color: #fff;
          font-weight: 600;
          transition: all ease 0.4s;
        }
        .wave-btn-base:hover {
          background: #060e18;
          box-shadow: 0 0 12px rgba(0,0,0,0), 0 0 12px rgba(0,0,0,.4) inset;
        }
        .wave-btn-base:hover .wave-layer { animation: wb-shadow ease 1s forwards; }
        .wave-btn-base:hover .wave-layer:nth-child(1)::before { top: -2px; left: -2px; }
        .wave-btn-base:hover .wave-layer:nth-child(1)::after  { bottom: -2px; right: -2px; }
        .wave-btn-base:hover .wave-layer:nth-child(2)::before { top: -2px; left: -2px; }
        .wave-btn-base:hover .wave-layer:nth-child(2)::after  { bottom: -2px; right: -2px; }
        .wave-btn-base:hover .wave-layer:nth-child(3)::before { top: -3px; left: -3px; }
        .wave-btn-base:hover .wave-layer:nth-child(3)::after  { bottom: -3px; right: -3px; }
        .wave-btn-base:hover .wave-layer:nth-child(4)::before { top: -4px; left: -4px; }
        .wave-btn-base:hover .wave-layer:nth-child(4)::after  { bottom: -4px; right: -4px; }

        .wave-bubble {
          position: absolute; z-index: 7;
          top: 0; width: 30px; height: 80px;
        }
        .wave-bubble::before, .wave-bubble::after {
          content: ''; position: absolute;
          bottom: 0; border-radius: 50%;
          background: rgba(255,255,255,0);
        }
        .wave-bubble:nth-child(6) { left: 16px; }
        .wave-bubble:nth-child(7) { left: 48px; }
        .wave-bubble:nth-child(8) { right: 16px; }
        .wave-bubble:nth-child(9) { right: 48px; }
        .wave-bubble:nth-child(6)::before { width:16px;height:16px;left:0;bottom:-60px;transition:all ease 3.7s; }
        .wave-bubble:nth-child(6)::after  { width:8px;height:8px;right:4px;bottom:-10px;transition:all ease 3.4s; }
        .wave-bubble:nth-child(7)::before { width:10px;height:10px;left:0;bottom:-25px;transition:all ease 3.5s; }
        .wave-bubble:nth-child(7)::after  { width:14px;height:14px;right:0;bottom:-50px;transition:all ease 3.3s; }
        .wave-bubble:nth-child(8)::before { width:16px;height:16px;left:0;bottom:-30px;transition:all ease 3.5s; }
        .wave-bubble:nth-child(8)::after  { width:8px;height:8px;right:4px;bottom:-70px;transition:all ease 3.3s; }
        .wave-bubble:nth-child(9)::before { width:10px;height:10px;left:0;bottom:-40px;transition:all ease 3.6s; }
        .wave-bubble:nth-child(9)::after  { width:14px;height:14px;right:0;bottom:-15px;transition:all ease 3.7s; }

        @keyframes wb-shadow {
          0%   { filter: drop-shadow(0 0 1.5px rgba(10,60,90,0.4)); }
          100% { filter: drop-shadow(0 0 10px rgba(10,60,90,0.35)); }
        }
        @keyframes wb-wave1 {
          0%   { clip-path: path('M140.44,0c-12.81,1.3-12.59,12.11-35.96,10.7-14.56-.88-16.21,19.13-40.12,10.57-17.84-6.39-37.9-1.86-49.13,10.03C2.01,45.31,3.29,51.05,0,65.19H140.44V0Z'); }
          100% { clip-path: path('M140.44,0c-17.21,3.05-17.35,17.42-35.08,14.77-16.69-2.49-23.72-6.62-50.13,7.7-13.98,6.99-26.83-2.07-39.76,8.45C4.54,39.98,3.29,48.5,0,62.64H140.44V0Z'); }
        }
        @keyframes wb-wave2 {
          0%   { clip-path: path('M137.15,.03c-16.75-.44-27.29,4.77-33.69,10.72-6.4,5.96-24.52,19.73-43.08,9.17-13.1-7.46-26.74-3.14-38.25,4.78C6.61,35.38,3.74,44.74,0,59.63H137.15V.03Z'); }
          100% { clip-path: path('M137.15,0c-17.21,10.16-17.24,10.78-37.72,9.6-14.61-.84-20.23,16.56-38.49,12.08-14.89-3.65-18.21,9.53-31.75,6.88C10.69,24.95,3.74,44.71,0,59.6H137.15V0Z'); }
        }
        @keyframes wb-wave3 {
          0%   { clip-path: path('M132.61,0c-9.18,3.92-11.29,5.2-19.97,4.19-9.33-1.09-10.97,12.29-25.37,15.53-9.69,2.18-17.12-7.15-28.89-5.37-15.68,2.38-16.35,7.79-29.01,9.38C4.37,26.86-.79,50.3,.09,54.49H132.61V0Z'); }
          100% { clip-path: path('M132.53,0c-3.02,8.29-13.7,3.05-21.15,10.78-6.52,6.76-10.8,3.72-29.64,3.97-9.93,.13-15.11,7.85-26.94,9.14-10.81,1.18-15.58-4.27-28.13-1.99C8.04,25.29-.82,50.3,.06,54.49H132.53V0Z'); }
        }
        @keyframes wb-wave4 {
          0%   { clip-path: path('M128.7,.2c-16.75-.44-23.99-.69-30.39,5.26-6.4,5.96-8.68,12.19-26.99,7.33-9.6-2.54-24.02-4.44-34.16,2.33-10.83,7.23-14.87,9.49-22.83,10.33C1.59,26.81-.72,39.73,.17,43.92H128.7V.2Z'); }
          100% { clip-path: path('M128.53,0c-13.22,12-19.04,5.96-27.62,4.3-12.9-2.5-14.51,2.69-29.7,10.84-8.75,4.7-15.33,2.81-28.21-.3-15.44-3.72-19.2,7.95-29.03,11.04C4.72,28.8,.76,37.83,0,43.72H128.53V0Z'); }
        }
      `}</style>
    </button>
  );
};

export default WaveButton;
