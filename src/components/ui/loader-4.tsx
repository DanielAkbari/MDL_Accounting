import React from 'react';
import styled from 'styled-components';

interface LoaderProps {
  fullScreen?: boolean;
  text?: string;
}

const Loader = ({ fullScreen = false, text = "loading..." }: LoaderProps) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-8 z-50">
      <div className="loader">
        <div className="cell d-0" />
        <div className="cell d-1" />
        <div className="cell d-2" />
        <div className="cell d-1" />
        <div className="cell d-2" />
        <div className="cell d-2" />
        <div className="cell d-3" />
        <div className="cell d-3" />
        <div className="cell d-4" />
      </div>
      <p className="text-xs uppercase tracking-[0.25em] font-bold text-slate-500 animate-pulse text-center select-none">
        {text}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <StyledFullScreenWrapper>
        {/* Simple dark background, no background glow, only dot grid */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        {content}
      </StyledFullScreenWrapper>
    );
  }

  return (
    <StyledWrapper>
      {content}
    </StyledWrapper>
  );
}

const loaderStyles = `
  .loader {
    --cell-size: 24px;
    --cell-spacing: 1.5px;
    --cells: 3;
    --total-size: calc(var(--cells) * (var(--cell-size) + 2 * var(--cell-spacing)));
    display: flex;
    flex-wrap: wrap;
    width: var(--total-size);
    height: var(--total-size);
  }

  .cell {
    flex: 0 0 var(--cell-size);
    margin: var(--cell-spacing);
    background-color: transparent;
    box-sizing: border-box;
    border-radius: 4px;
    animation: 1.5s ripple ease infinite;
    transform: scale(0.95);
  }

  .cell.d-1 {
    animation-delay: 100ms;
  }

  .cell.d-2 {
    animation-delay: 200ms;
  }

  .cell.d-3 {
    animation-delay: 300ms;
  }

  .cell.d-4 {
    animation-delay: 400ms;
  }

  /* Matching Fintrax gradient color system: Neon green to cyan */
  .cell:nth-child(1) {
    --cell-color: #00FF87;
  }

  .cell:nth-child(2) {
    --cell-color: #0CFD95;
  }

  .cell:nth-child(3) {
    --cell-color: #17FBA2;
  }

  .cell:nth-child(4) {
    --cell-color: #23F9B2;
  }

  .cell:nth-child(5) {
    --cell-color: #30F7C3;
  }

  .cell:nth-child(6) {
    --cell-color: #3DF5D4;
  }

  .cell:nth-child(7) {
    --cell-color: #45F4DE;
  }

  .cell:nth-child(8) {
    --cell-color: #53F1F0;
  }

  .cell:nth-child(9) {
    --cell-color: #60EFFF;
  }

  /*Animation without glow box-shadow*/
  @keyframes ripple {
    0% {
      background-color: transparent;
      transform: scale(0.95);
    }

    30% {
      background-color: var(--cell-color);
      transform: scale(1.08);
    }

    60% {
      background-color: transparent;
      transform: scale(0.95);
    }

    100% {
      background-color: transparent;
      transform: scale(0.95);
    }
  }
`;

const StyledWrapper = styled.div`
  ${loaderStyles}
`;

const StyledFullScreenWrapper = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: #060b18;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  ${loaderStyles}
`;

export default Loader;
