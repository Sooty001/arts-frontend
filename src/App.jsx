import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import HomePage from './components/pages/HomePage';
import ProfilePage from './components/pages/Profile/ProfilePage';
import EditProfilePage from './components/pages/Profile/EditProfilePage';
import AuthPage from './components/pages/AuthPage';
import SubscriptionsPage from './components/pages/SubscriptionsPage';
import LikedArtsPage from './components/pages/LikedArtsPage';
import ArtEditor from './components/ArtEditor';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getAccessToken, getRefreshToken, isAccessTokenExpired, isRefreshTokenExpired } from './api/api';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const hasValidTokens = (getAccessToken() && !isAccessTokenExpired()) || (getRefreshToken() && !isRefreshTokenExpired());

  if (!isAuthenticated && !hasValidTokens) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="profile/:userId" element={<ProfilePage />} />
          <Route path="edit-profile" element={<EditProfilePage />} />
          <Route path="upload-art" element={<ArtEditor />} />
          <Route path="edit-art/:artId" element={<ArtEditor />} />
          <Route path="liked" element={<PrivateRoute><LikedArtsPage /></PrivateRoute>} />
          <Route path="subscriptions" element={<PrivateRoute><SubscriptionsPage /></PrivateRoute>} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="login" element={<Navigate to="/auth" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
