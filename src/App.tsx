import { UI_TEXT } from './config/uiText';
import { UnifiedSocialSlider } from './components/Social/UnifiedSocialSlider';
import './App.css';

export function App() {
  return (
    <div class="app-page-layout">
      <main class="app-main-content">
        <UnifiedSocialSlider title={UI_TEXT.heading} />
      </main>
    </div>
  );
}

export default App;
