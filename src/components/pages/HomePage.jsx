import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HeroSection from '../common/HeroSection';
import ArtFilters from '../ArtFilters';
import ArtGallery from '../ArtGallery';
import ArtModal from '../ArtModal';
import '../../styles/HomePage.css';

import { getFeedArtworks, searchArtsByName } from '../../api/api';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('trending');
  const [artworks, setArtworks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArt, setSelectedArt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  const location = useLocation();
  const navigate = useNavigate();

  const searchQuery = new URLSearchParams(location.search).get('query');
  const isSearchMode = !!searchQuery;

  const loadingRef = useRef(false);

  const fetchArtworks = useCallback(async (pageToLoad, append = false) => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let apiResult;
      let responseContent = [];
      let totalElementsFromApi = 0;

      if (isSearchMode) {
        apiResult = await searchArtsByName(searchQuery, pageToLoad + 1, pageSize);
      } else {
        apiResult = await getFeedArtworks(activeTab, pageToLoad + 1, pageSize);
      }

      if (apiResult && typeof apiResult === 'object') {
        responseContent = apiResult.content || [];
        totalElementsFromApi = apiResult.totalElements || 0;
      } else {
        setHasMore(false);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const transformedArtworks = (responseContent || []).map(art => {
        if (!art || !art.id || !art.imageUrl) {
          return null;
        }
        return {
          id: art.id,
          title: art.name,
          src: art.imageUrl,
          author: art.authorUserName || 'Неизвестный автор',
          authorAvatar: art.authorAvatarUrl || '',
          likes: art.countLikes,
          views: art.countViews,
          publicationTime: art.publicationTime,
          comments: [],
          tags: []
        };
      }).filter(Boolean);

      setArtworks(prevArtworks => {
        const newArtworks = append ? [...prevArtworks, ...transformedArtworks] : transformedArtworks;

        const currentLoadedCount = newArtworks.length;
        const totalExpected = totalElementsFromApi;

        const moreAvailable = currentLoadedCount < totalExpected;
        setHasMore(moreAvailable);

        return newArtworks;
      });

      setCurrentPage(pageToLoad);

    } catch (err) {
      setError(err);
      setArtworks(append ? artworks : []);
      setHasMore(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [activeTab, isSearchMode, searchQuery, pageSize]);

  useEffect(() => {
    setArtworks([]);
    setCurrentPage(0);
    setHasMore(true);
    loadingRef.current = false;
    fetchArtworks(0, false);
  }, [activeTab, isSearchMode, searchQuery, fetchArtworks]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 100;
      const isAtBottom = (window.innerHeight + document.documentElement.scrollTop + scrollThreshold) >= document.documentElement.offsetHeight;

      if (isAtBottom && !loadingRef.current && hasMore && !error) {
        fetchArtworks(currentPage + 1, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loadingRef, hasMore, currentPage, error, fetchArtworks]);

  const handleTabChange = useCallback((tab) => {
    navigate('/', { replace: true });
    setActiveTab(tab);
  }, [navigate]);

  const openModal = useCallback((artwork) => {
    setSelectedArt(artwork);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedArt(null);
  }, []);

  const showFilters = !isSearchMode;
  const displayNoResultsMessage = isSearchMode && artworks.length === 0 && !loading && !error;

  if (loading && artworks.length === 0 && !error) {
    return (
      <div className="page-content-home">
        <HeroSection />
        {showFilters && <ArtFilters activeTab={activeTab} onTabChange={handleTabChange} />}
        {isSearchMode && <div className="search-info">Поиск по: "{searchQuery}"</div>}
        <div className="loading-message">Загрузка работ...</div>
      </div>
    );
  }

  if (error && artworks.length === 0) {
    return (
      <div className="page-content-home">
        <HeroSection />
        {showFilters && <ArtFilters activeTab={activeTab} onTabChange={handleTabChange} />}
        {isSearchMode && <div className="search-info">Поиск по: "{searchQuery}"</div>}
        <div className="error-message">Ошибка загрузки данных: {error.message}. Пожалуйста, попробуйте обновить страницу</div>
      </div>
    );
  }

  return (
    <div className="page-content-home">
      <HeroSection />
      {showFilters && <ArtFilters activeTab={activeTab} onTabChange={handleTabChange} />}
      {isSearchMode && (
          <div className="search-header">
              <h2>Результаты поиска для: "{searchQuery}"</h2>
              
          </div>
      )}
      <ArtGallery artworks={artworks} onArtCardClick={openModal} />

      {loading && artworks.length > 0 && !error && (
        <div className="loading-message">Загрузка новых работ...</div>
      )}
      {artworks.length === 0 && !loading && !error && (
        <div className="empty-results-message">К сожалению, по вашему запросу ничего не найдено.</div>
      )}

      {isModalOpen && selectedArt && (
        <ArtModal
          artwork={selectedArt}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default HomePage;