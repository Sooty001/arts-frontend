import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUserMin } from '../../api/api';

const Topbar = ({ isAuthenticated, propUser }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserPhotoUrl, setCurrentUserPhotoUrl] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchUserPhoto = async () => {
            if (isAuthenticated) {
                const userData = await getCurrentUserMin();
                if (userData) {
                    if (userData.photoUrl) {
                        setCurrentUserPhotoUrl(userData.photoUrl);
                    } else {
                        setCurrentUserPhotoUrl(null);
                    }
                    setCurrentUserId(userData.id);
                } else {
                    setCurrentUserPhotoUrl(null);
                    setCurrentUserId(null);
                }
            } else {
                setCurrentUserPhotoUrl(null);
                setCurrentUserId(null);
            }
        };

        fetchUserPhoto();
    }, [isAuthenticated]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const queryFromUrl = params.get('query');
        if (queryFromUrl) {
            setSearchQuery(queryFromUrl);
        } else {
            setSearchQuery('');
        }
    }, [location.search]);

    const handleSearchInputChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleSearchSubmit = useCallback((e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?query=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate('/');
        }
    }, [searchQuery, navigate]);

    const handleAvatarClick = useCallback(() => {
        if (isAuthenticated && currentUserId) {
            navigate(`/profile/${currentUserId}`);
        } else if (isAuthenticated && !currentUserId) {
            navigate('/profile');
        }
    }, [isAuthenticated, currentUserId, navigate]);

    const finalUserPhotoUrl = currentUserPhotoUrl || (propUser?.photoUrl || '/default-avatar.png');

    return (
        <div className="topbar">
            <div className="topbar__logo">
                <div className="topbar__logo-container">
                    <h1 className="topbar__logo-text">ArtVista</h1>
                </div>
            </div>

            <form className="topbar__search" onSubmit={handleSearchSubmit}>
                <i className="fa-solid fa-search"></i>
                <input
                    type="text"
                    placeholder="Поиск"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                />
            </form>

            <div className="topbar__profile">
                {isAuthenticated ? (
                    <div
                        className="avatar"
                        style={{ backgroundImage: `url('${finalUserPhotoUrl}')`, cursor: 'pointer' }}
                        onClick={handleAvatarClick}
                        title="Мой профиль"
                    ></div>
                ) : (
                    null
                )}
            </div>
        </div>
    );
};

export default Topbar;