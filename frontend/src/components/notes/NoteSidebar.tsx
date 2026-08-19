import type { ReactElement } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

interface TagCount {
  name: string;
  count: number;
}

interface NoteSidebarProps {
  totalNotes: number;
  tags: TagCount[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onNewNote: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function NoteSidebar({
  totalNotes,
  tags,
  selectedTag,
  onSelectTag,
  onNewNote,
  isOpenMobile = false,
  onCloseMobile,
}: NoteSidebarProps): ReactElement {
  const { user, logout } = useAuth();

  const getInitials = (name?: string, email?: string): string => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleTagClick = (tag: string | null): void => {
    onSelectTag(tag);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {isOpenMobile && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}
      <aside className={`note-sidebar ${isOpenMobile ? 'sidebar-open-mobile' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span className="sidebar-brand-name">Notes</span>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
            >
              &times;
            </button>
          )}
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{getInitials(user?.name, user?.email)}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'My Notes'}</span>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>

        <div className="sidebar-action">
          <Button
            variant="primary"
            size="md"
            className="new-note-btn"
            onClick={() => {
              onNewNote();
              if (onCloseMobile) onCloseMobile();
            }}
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          >
            New Note
          </Button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">WORKSPACE</div>
          <ul className="nav-list">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-button ${selectedTag === null ? 'nav-button-active' : ''}`}
                onClick={() => handleTagClick(null)}
              >
                <span className="nav-button-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </span>
                <span className="nav-button-label">All Notes</span>
                <span className="nav-button-count">{totalNotes}</span>
              </button>
            </li>
          </ul>

          {tags.length > 0 && (
            <>
              <div className="nav-section-title">TAGS & CATEGORIES</div>
              <ul className="nav-list tag-nav-list">
                {tags.map((tag) => (
                  <li key={tag.name} className="nav-item">
                    <button
                      type="button"
                      className={`nav-button ${selectedTag === tag.name ? 'nav-button-active' : ''}`}
                      onClick={() => handleTagClick(tag.name)}
                    >
                      <span className="nav-button-prefix">#</span>
                      <span className="nav-button-label">{tag.name}</span>
                      <span className="nav-button-count">{tag.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <Button
            variant="ghost"
            size="sm"
            className="logout-btn"
            onClick={logout}
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            }
          >
            Log Out
          </Button>
        </div>
      </aside>
    </>
  );
}
