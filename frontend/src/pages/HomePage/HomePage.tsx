import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchUsers,
  fetchMyVotes,
  voteForUser,
  loadUserFromStorage,
  setCurrentUser,
  fetchUserProfile,
  setUsers,
} from "../../store/slices/votingSlice";
import { socketService } from "../../services/socketService";
import UserCard from "../../components/UserCard/UserCard";
import LoginModal from "../../components/LoginModal/LoginModal";
import EditProfileModal from "../../components/EditProfileModal/EditProfileModal";
import StatusModal from "../../components/StatusModal/StatusModal";
import styles from "./HomePage.module.css";

interface UserRank {
  id: string;
  rank: number;
  voteCount: number;
}

const HomePage = () => {
  const dispatch = useAppDispatch();
  const { users, currentUser, userProfile, userVotes, loading } =
    useAppSelector((state) => state.voting);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [votingUserId, setVotingUserId] = useState<string | null>(null);
  const [highlightedUsers, setHighlightedUsers] = useState<Set<string>>(new Set());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const previousRanksRef = useRef<Map<string, UserRank>>(new Map());
  const cardRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousPositionsRef = useRef<Map<string, { top: number; left: number }>>(new Map());
  const isAnimatingRef = useRef(false);
  const unfreezeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRankingFrozenRef = useRef(false);
  const pendingRankChangesRef = useRef<Map<string, { oldRank: number; newRank: number }>>(new Map());

  useEffect(() => {
    // Load user from localStorage on mount
    dispatch(loadUserFromStorage());

    // Fetch users
    dispatch(fetchUsers());

    // Initialize positions after first render
    return () => {
      // Cleanup
      previousPositionsRef.current.clear();
      isAnimatingRef.current = false;
    };
  }, [dispatch]);

  useEffect(() => {
    // Fetch user votes and profile when logged in
    if (currentUser) {
      dispatch(fetchMyVotes());
      dispatch(fetchUserProfile());
    }
  }, [currentUser, dispatch]);

  // Calculate sorted users and ranks
  const sortedUsersWithRanks = useMemo(() => {
    const sorted = [...users].sort((a, b) => b.voteCount - a.voteCount);
    const calculateRankForIndex = (currentIndex: number): number => {
      const currentVoteCount = sorted[currentIndex].voteCount;
      let usersWithHigherVotes = 0;
      for (let i = 0; i < currentIndex; i++) {
        if (sorted[i].voteCount > currentVoteCount) {
          usersWithHigherVotes++;
        }
      }
      return usersWithHigherVotes + 1;
    };
    
    return sorted.map((user, index) => {
      const rank = calculateRankForIndex(index);
      return { ...user, rank };
    });
  }, [users]);

  // Check if current logged-in user is dangerous (rank 1 with votes > 0)
  const isCurrentUserDangerous = useMemo(() => {
    if (!currentUser || !userProfile?._id) return false;
    
    const currentLoggedInUser = sortedUsersWithRanks.find(
      (user) => user.id === userProfile._id || user._id === userProfile._id
    );
    
    if (!currentLoggedInUser) return false;
    
    // Check if user is rank 1 with votes > 0
    return currentLoggedInUser.rank === 1 && currentLoggedInUser.voteCount > 0;
  }, [sortedUsersWithRanks, currentUser, userProfile]);

  // Save positions before rank changes (runs after paint, before next render)
  // This always runs to capture positions, even when frozen
  useEffect(() => {
    if (sortedUsersWithRanks.length === 0) return;
    if (isAnimatingRef.current) return;

    // Always save current positions to ensure we have them for animation
    // This is critical for FLIP animation - we need the "FIRST" position
    const currentPositions = new Map<string, { top: number; left: number }>();
    cardRefsRef.current.forEach((element, userId) => {
      if (element) {
        const rect = element.getBoundingClientRect();
        const parentRect = element.parentElement?.getBoundingClientRect();
        if (parentRect) {
          currentPositions.set(userId, {
            top: rect.top - parentRect.top,
            left: rect.left - parentRect.left,
          });
        }
      }
    });

    // Check if there are any rank changes in the current render
    let hasRankChanges = false;
    sortedUsersWithRanks.forEach((user) => {
      const prevRank = previousRanksRef.current.get(user.id);
      if (prevRank && prevRank.rank !== user.rank) {
        hasRankChanges = true;
      }
    });

    // Only update previous positions if there are no rank changes
    // This preserves old positions for FLIP animation when rank changes occur
    if (!hasRankChanges && currentPositions.size > 0) {
      previousPositionsRef.current = currentPositions;
    }
  }, [sortedUsersWithRanks]);

  // Track rank changes and trigger animations using layout effect
  // This always tracks changes, but only animates when not frozen
  useLayoutEffect(() => {
    if (sortedUsersWithRanks.length === 0) return;
    if (isAnimatingRef.current) return;

    const currentRanks = new Map<string, UserRank>();
    const changedUsers = new Set<string>();
    const rankChangedUsers = new Map<string, { oldRank: number; newRank: number }>();

    sortedUsersWithRanks.forEach((user) => {
      const prevRank = previousRanksRef.current.get(user.id);
      currentRanks.set(user.id, {
        id: user.id,
        rank: user.rank,
        voteCount: user.voteCount,
      });

      if (prevRank) {
        // Check if rank changed
        if (prevRank.rank !== user.rank || prevRank.voteCount !== user.voteCount) {
          changedUsers.add(user.id);
          if (prevRank.rank !== user.rank) {
            rankChangedUsers.set(user.id, { oldRank: prevRank.rank, newRank: user.rank });
          }
        }
      }
    });

    // Track rank changes even when frozen
    if (rankChangedUsers.size > 0) {
      // Merge with existing pending changes
      rankChangedUsers.forEach((change, userId) => {
        pendingRankChangesRef.current.set(userId, change);
      });
    }

    // Update previous ranks immediately (even when frozen) to track changes
    previousRanksRef.current = currentRanks;

    // Only animate if not frozen and there are rank changes
    const hasPendingChanges = pendingRankChangesRef.current.size > 0;
    const shouldAnimate = !isRankingFrozenRef.current && (rankChangedUsers.size > 0 || hasPendingChanges);
    
    if (shouldAnimate && previousPositionsRef.current.size > 0) {
      isAnimatingRef.current = true;
      
      // FLIP Animation: Get new positions after DOM update (LAST)
      const newPositions = new Map<string, { top: number; left: number }>();
      cardRefsRef.current.forEach((element, userId) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          const parentRect = element.parentElement?.getBoundingClientRect();
          if (parentRect) {
            newPositions.set(userId, {
              top: rect.top - parentRect.top,
              left: rect.left - parentRect.left,
            });
          }
        }
      });

      // FLIP Animation: Calculate deltas and apply transforms (INVERT)
      cardRefsRef.current.forEach((element, userId) => {
        if (!element) return;
        
        const oldPos = previousPositionsRef.current.get(userId);
        const newPos = newPositions.get(userId);
        
        if (oldPos && newPos && (oldPos.top !== newPos.top || oldPos.left !== newPos.left)) {
          const deltaY = oldPos.top - newPos.top;
          const deltaX = oldPos.left - newPos.left;
          
          // INVERT: Apply transform to move from old position
          // This makes the element appear to stay in place visually
          element.style.transition = 'none';
          element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          element.style.zIndex = '100';
        }
      });

      // FLIP Animation: Play animation (PLAY)
      // Use double requestAnimationFrame to ensure browser has painted the inverted state
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cardRefsRef.current.forEach((element, userId) => {
            if (!element) return;
            
            const oldPos = previousPositionsRef.current.get(userId);
            const newPos = newPositions.get(userId);
            
            if (oldPos && newPos && (oldPos.top !== newPos.top || oldPos.left !== newPos.left)) {
              // PLAY: Remove transform to animate to new position
              // This creates the smooth animation effect
              element.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
              element.style.transform = 'translate(0, 0)';
              
              // Cleanup after animation completes
              setTimeout(() => {
                if (element) {
                  element.style.zIndex = '';
                  element.style.transition = '';
                }
              }, 600);
            }
          });

          // Update previous positions after animation completes
          setTimeout(() => {
            previousPositionsRef.current = newPositions;
            isAnimatingRef.current = false;
            // Clear pending changes after animation
            pendingRankChangesRef.current.clear();
          }, 600);
        });
      });
    }

    // Highlight changed users (even when frozen, to show vote count updates)
    if (changedUsers.size > 0) {
      setHighlightedUsers(changedUsers);
      
      // Remove highlight after animation
      setTimeout(() => {
        setHighlightedUsers(new Set());
      }, 2000);
    }
  }, [sortedUsersWithRanks]);

  // WebSocket real-time updates
  useEffect(() => {
    // Connect to WebSocket
    const socket = socketService.connect();

    // Listen for users updates
    const handleUsersUpdate = (updatedUsers: any[]) => {
      // Transform users data to match Redux state format
      const formattedUsers = updatedUsers.map((user) => ({
        _id: user._id,
        id: user._id,
        name: user.name,
        image: user.image,
        voteCount: user.voteCount,
        status: user.status,
      }));
      
      // Update Redux store with new users data
      dispatch(setUsers(formattedUsers));
    };

    socket.on('usersUpdated', handleUsersUpdate);

    // Cleanup on unmount
    return () => {
      socket.off('usersUpdated', handleUsersUpdate);
      // Don't disconnect socket here as it might be used by other components
      // socketService.disconnect();
    };
  }, [dispatch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (unfreezeTimeoutRef.current) {
        clearTimeout(unfreezeTimeoutRef.current);
      }
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isUserMenuOpen && !target.closest(`.${styles.avatarContainer}`)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isUserMenuOpen]);

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    if (!currentUser) setIsLoginModalOpen(true);
  };

  const handleFreezeRanking = () => {
    isRankingFrozenRef.current = true;
    
    // Clear existing timeout
    if (unfreezeTimeoutRef.current) {
      clearTimeout(unfreezeTimeoutRef.current);
    }
    
    // Unfreeze after 2.5 seconds of no interaction
    // When unfreezing, any pending rank changes will animate smoothly
    unfreezeTimeoutRef.current = setTimeout(() => {
      // Before unfreezing, save current positions as "old" positions for FLIP animation
      // This ensures we have the correct starting point for animation
      const currentPositions = new Map<string, { top: number; left: number }>();
      cardRefsRef.current.forEach((element, userId) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          const parentRect = element.parentElement?.getBoundingClientRect();
          if (parentRect) {
            currentPositions.set(userId, {
              top: rect.top - parentRect.top,
              left: rect.left - parentRect.left,
            });
          }
        }
      });
      
      if (currentPositions.size > 0) {
        previousPositionsRef.current = currentPositions;
      }
      
      isRankingFrozenRef.current = false;
      unfreezeTimeoutRef.current = null;
      
      // Force a re-check by triggering a state update
      // This will cause useLayoutEffect to run and animate pending changes
      // We use a small delay to ensure DOM has updated
      setTimeout(() => {
        // The useLayoutEffect will detect pendingRankChangesRef and animate them
      }, 0);
    }, 2500);
  };

  const handleVote = async (userId: string) => {
    if (!currentUser) {
      handleUserClick(userId);
      return;
    }

    // Freeze ranking when user clicks vote
    handleFreezeRanking();

    try {
      setVotingUserId(userId);
      await dispatch(voteForUser(userId));
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setVotingUserId(null);
    }
  };

  const handleLoginSuccess = async () => {
    // Refresh users and votes after login
    await dispatch(fetchUsers());
    if (currentUser) {
      await dispatch(fetchMyVotes());
    }

    // If user clicked on a user before logging in, vote for them
    if (selectedUserId) {
      setTimeout(async () => {
        try {
          setVotingUserId(selectedUserId);
          await dispatch(voteForUser(selectedUserId));
        } catch (error) {
          console.error("Vote error:", error);
        } finally {
          setVotingUserId(null);
        }
      }, 100);
    }
  };

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
    setSelectedUserId(null);
  };

  const canVote = (userId: string): boolean => {
    if (!currentUser) return false;
    const isVoted = userVotes.includes(userId);
    // Can vote if: not voted and has less than 3 votes, or already voted (can unvote)
    return isVoted || userVotes.length < 3;
  };

  const getDangerLevelClass = (
    rank: number,
    sortedUsersWithRanks: Array<{ rank: number; voteCount: number }>
  ): string => {
    // Kiểm tra nếu tất cả mọi người đều chưa có vote (voteCount = 0)
    const allHaveZeroVotes = sortedUsersWithRanks.every(
      (user) => user.voteCount === 0
    );

    if (allHaveZeroVotes) {
      // Nếu tất cả đều hạng 1 (chưa có vote), tất cả đều bình thường
      return "";
    }

    // Kiểm tra nếu chỉ có hạng 1 và tất cả mọi người khác là hạng 2
    const uniqueRanks = new Set(
      sortedUsersWithRanks.map((user) => user.rank)
    );
    const hasOnlyRank1And2 =
      uniqueRanks.size === 2 &&
      uniqueRanks.has(1) &&
      uniqueRanks.has(2) &&
      !uniqueRanks.has(3);

    if (hasOnlyRank1And2) {
      // Chỉ hạng 1 nguy hiểm, còn lại bình thường
      return rank === 1 ? styles.first : "";
    }

    // Logic bình thường:
    // Hạng 1: nguy hiểm
    // Hạng 2: nguy hiểm vừa
    // Hạng 3 trở lên: bình thường
    if (rank === 1) {
      return styles.first;
    }
    if (rank === 2) {
      return styles.second;
    }
    return "";
  };

  const getDangerLevel = (
    rank: number,
    sortedUsersWithRanks: Array<{ rank: number; voteCount: number }>
  ): 'dangerous' | 'moderate' | 'normal' => {
    // Kiểm tra nếu tất cả mọi người đều chưa có vote (voteCount = 0)
    const allHaveZeroVotes = sortedUsersWithRanks.every(
      (user) => user.voteCount === 0
    );

    if (allHaveZeroVotes) {
      // Nếu tất cả đều hạng 1 (chưa có vote), tất cả đều bình thường
      return 'normal';
    }

    // Kiểm tra nếu chỉ có hạng 1 và tất cả mọi người khác là hạng 2
    const uniqueRanks = new Set(
      sortedUsersWithRanks.map((user) => user.rank)
    );
    const hasOnlyRank1And2 =
      uniqueRanks.size === 2 &&
      uniqueRanks.has(1) &&
      uniqueRanks.has(2) &&
      !uniqueRanks.has(3);

    if (hasOnlyRank1And2) {
      // Chỉ hạng 1 nguy hiểm, còn lại bình thường
      return rank === 1 ? 'dangerous' : 'normal';
    }

    // Logic bình thường:
    // Hạng 1: nguy hiểm
    // Hạng 2: nguy hiểm vừa
    // Hạng 3 trở lên: bình thường
    if (rank === 1) {
      return 'dangerous';
    }
    if (rank === 2) {
      return 'moderate';
    }
    return 'normal';
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    dispatch(setCurrentUser(null));
    setIsUserMenuOpen(false);
  };

  const handleEditProfile = () => {
    setIsEditProfileModalOpen(true);
    setIsUserMenuOpen(false);
  };

  const handleEditStatus = () => {
    setIsStatusModalOpen(true);
    setIsUserMenuOpen(false);
  };

  const handleToggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  const handleUpdateProfileSuccess = async () => {
    await dispatch(fetchUserProfile());
    await dispatch(fetchUsers());
  };

  const handleScrollToUser = (userId: string) => {
    const userCardElement = cardRefsRef.current.get(userId);
    if (userCardElement) {
      userCardElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  return (
    <div className={`${styles.container} ${isCurrentUserDangerous ? styles.currentUserDangerous : ''}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Bảng Xếp Hạng</h1>
        <h1 className={styles.title}>Mức Độ Tình Nghi</h1>
        {currentUser ? (
          <div className={styles.userInfo}>
            <div className={styles.userInfoLeft}>
              {userProfile?.image && (
                <div className={styles.avatarContainer}>
                  <img
                    src={userProfile.image}
                    alt="Avatar"
                    className={styles.userAvatar}
                    onClick={handleToggleUserMenu}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggleUserMenu();
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Mở menu người dùng"
                  />
                  {isUserMenuOpen && (
                    <div className={styles.userMenu}>
                      <button
                        className={styles.menuItem}
                        onClick={handleEditStatus}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleEditStatus();
                          }
                        }}
                        tabIndex={0}
                        aria-label="Cập nhật trạng thái"
                      >
                        Trạng thái
                      </button>
                      <button
                        className={styles.menuItem}
                        onClick={handleEditProfile}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleEditProfile();
                          }
                        }}
                        tabIndex={0}
                        aria-label="Chỉnh sửa tài khoản"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        className={styles.menuItem}
                        onClick={handleLogout}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleLogout();
                          }
                        }}
                        tabIndex={0}
                        aria-label="Thoát"
                      >
                        Thoát
                      </button>
                    </div>
                  )}
                </div>
              )}
              <span className={styles.userLabel}>Người dùng:</span>
              <span className={styles.userName}>{currentUser}</span>
            </div>
            <span className={styles.voteInfo}>
              ({userVotes.length}/3 votes)
            </span>
          </div>
        ):(
          <button
            className={styles.loginButton}
            onClick={() => setIsLoginModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsLoginModalOpen(true);
              }
            }}
            tabIndex={0}
            aria-label="Đăng nhập"
          >
            Đăng nhập
          </button>
        )}
      </div>

      {loading && users.length === 0 && (
        <div className={styles.loading}>Đang tải...</div>
      )}

      <div 
        className={styles.userList}
        onMouseEnter={handleFreezeRanking}
        onFocus={handleFreezeRanking}
        onMouseLeave={handleFreezeRanking}
        onBlur={handleFreezeRanking}
        tabIndex={0}
      >
        {sortedUsersWithRanks.map((user) => {
          const dangerLevelClass = getDangerLevelClass(user.rank, sortedUsersWithRanks);
          const dangerLevel = getDangerLevel(user.rank, sortedUsersWithRanks);
          const isHighlighted = highlightedUsers.has(user.id);
          const prevRank = previousRanksRef.current.get(user.id);
          const rankChanged = prevRank && prevRank.rank !== user.rank;
          const rankDirection = prevRank && prevRank.rank > user.rank ? 'up' : prevRank && prevRank.rank < user.rank ? 'down' : null;

          return (
            <div
              key={user.id}
              ref={(el) => {
                if (el) {
                  cardRefsRef.current.set(user.id, el);
                } else {
                  cardRefsRef.current.delete(user.id);
                }
              }}
              className={`${styles.cardWrapper} ${isHighlighted ? styles.highlighted : ''} ${rankChanged ? styles.rankChanged : ''} ${rankDirection ? styles[`rank${rankDirection.charAt(0).toUpperCase() + rankDirection.slice(1)}`] : ''}`}
              data-rank={user.rank}
              onMouseEnter={handleFreezeRanking}
              onFocus={handleFreezeRanking}
              onMouseLeave={handleFreezeRanking}
              onBlur={handleFreezeRanking}
              tabIndex={0}
            >
              <UserCard
                id={user.id}
                name={user.name}
                image={user.image}
                voteCount={user.voteCount}
                isVoted={userVotes.includes(user.id)}
                onVote={() => handleVote(user.id)}
                onClick={() => handleUserClick(user.id)}
                canVote={canVote(user.id)}
                isLoggedIn={!!currentUser}
                isVoting={votingUserId === user.id}
                dangerLevel={dangerLevel}
                onScrollToUser={handleScrollToUser}
                status={user.status}
              >
                <span
                  className={`${styles.rank} ${dangerLevelClass} ${rankChanged ? styles.rankAnimation : ''}`}
                >
                  {user.rank}
                </span>
              </UserCard>
            </div>
          );
        })}
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleCloseModal}
        onLoginSuccess={handleLoginSuccess}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onUpdateSuccess={handleUpdateProfileSuccess}
        currentProfile={
          userProfile
            ? {
                name: userProfile.name,
                image: userProfile.image,
              }
            : null
        }
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onUpdateSuccess={handleUpdateProfileSuccess}
        currentStatus={userProfile?.status}
      />
    </div>
  );
};

export default React.memo(HomePage);
