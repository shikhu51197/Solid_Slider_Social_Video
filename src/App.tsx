import { SocialMediaSlider } from './components/SocialSlider/SocialMediaSlider';
import { createSocialDataProvider } from './services/socialDataProvider';
import './components/SocialSlider/SocialMediaSlider.css';

export function App() {
  const liveProvider = createSocialDataProvider('live');

  return (
    <main class="social-page-container">
      {/* Primary Social Media Slider Component */}
      <SocialMediaSlider
        heading="Latest from social"
        dataProvider={liveProvider}
      />
    </main>
  );
}

export default App;
