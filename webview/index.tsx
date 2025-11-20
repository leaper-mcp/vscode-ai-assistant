
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import './styles.css';

// 使用已存在的 root 元素
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
} else {
    console.error('Root element not found');
}