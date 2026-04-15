import { setupProjectSelector } from './ProjectSelector.js';
import { quickSearch } from '../QuickPick/QuickSearch.js';

document.addEventListener('DOMContentLoaded', () => {
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const closeBtn = document.getElementById('close-btn');

  minimizeBtn.addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });

  maximizeBtn.addEventListener('click', () => {
    window.electronAPI.maximizeWindow();
  });

  closeBtn.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });

  // Initialize Search Widget trigger
  const searchBar = document.querySelector('.titlebar-search-container');
  if (searchBar) {
    searchBar.addEventListener('click', () => {
      quickSearch.show();
    });
  }

  // Initialize Project Selector
  setupProjectSelector();
});

