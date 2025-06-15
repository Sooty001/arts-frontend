import { NavLink } from 'react-router-dom';

const Sidebar = ({ sidebarMenuItems, isAuthenticated, onLogout }) => {
    const filteredMenuItems = sidebarMenuItems.filter(item => {
        if (['profile', 'subscriptions', 'liked'].includes(item.id)) {
            return isAuthenticated;
        }
        return true;
    });

    const mainMenuItems = filteredMenuItems.filter(item => !item.isBottom);
    const bottomMenuItems = filteredMenuItems.filter(item => item.isBottom);

    return (
        <div className="sidebar-panel">
            <aside className="sidebar">
                <nav className="sidebar__menu">
                    {mainMenuItems.map(item => (
                        <NavLink key={item.id} to={`/${item.id}`} className="sidebar__menu-item">
                            <i className={`fa-solid fa-${item.icon}`}></i>
                            <span>{item.text}</span>
                        </NavLink>
                    ))}
                    <div className="sidebar__divider"></div>
                    {isAuthenticated ? (
                        <a href="#" onClick={onLogout} className="sidebar__menu-item">
                            <i className="fa-solid fa-sign-out-alt"></i>
                            <span>Выйти</span>
                        </a>
                    ) : (
                        <NavLink to="/auth" className="sidebar__menu-item">
                            <i className="fa-solid fa-sign-in-alt"></i>
                            <span>Войти</span>
                        </NavLink>
                    )}
                    {bottomMenuItems.map(item => (
                        <NavLink key={item.id} to={`/${item.id}`} className="sidebar__menu-item">
                            <i className={`fa-solid fa-${item.icon}`}></i>
                            <span>{item.text}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </div>
    );
};

export default Sidebar;