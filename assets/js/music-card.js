document.addEventListener('DOMContentLoaded', function() {
    const baseUrl = window.baseUrl || '';

    const musicList = [
        {
            title: "Head Empty",
            artist: "Tsundere Twintails",
            cover: baseUrl + "assets/music/cover/Tsundere Twintails - Head Empty.jpg",
            audio: baseUrl + "assets/music/Tsundere Twintails - Head Empty.mp3"
        },
        {
            title: "24_7（纯音乐）",
            artist: "5",
            cover: baseUrl + "assets/music/cover/5 - 24_7（纯音乐）.jpg",
            audio: baseUrl + "assets/music/5 - 24_7（纯音乐）.mp3"
        },
        {
            title: "夏至未至（钢琴版）",
            artist: "会弹琴的羊",
            cover: baseUrl + "assets/music/cover/会弹琴的羊 - 夏至未至（钢琴版）.jpg",
            audio: baseUrl + "assets/music/会弹琴的羊 - 夏至未至（钢琴版）.mp3"
        },
        {
            title: "Mystery of love -长笛演奏版",
            artist: "Chelsea范佳颖", 
            cover: baseUrl + "assets/music/cover/Chelsea范佳颖 - Mystery of love -长笛演奏版.jpg",
            audio: baseUrl + "assets/music/Chelsea范佳颖 - Mystery of love -长笛演奏版.mp3"  
        },
        {
            title: "it's 6pm but I miss u already",
            artist: "",
            cover: baseUrl + "assets/music/cover/bbbluelee,Furyl,Siren - it is 6pm but I miss u already.jpg",
            audio: baseUrl + "assets/music/bbbluelee,Furyl,Siren - it's 6pm but I miss u already.mp3"
        },
        {
            title: "You(=I)",
            artist: "_小漪Yiiii",
            cover: baseUrl + "assets/music/cover/_小漪Yiiii - You(=I).jpg",
            audio: baseUrl + "assets/music/_小漪Yiiii - You(=I).mp3"
        },
        {
            title: "匿名的好友",
            artist: "Sasablue",
            cover: baseUrl + "assets/music/cover/Sasablue - 匿名的好友.png",
            audio: baseUrl + "assets/music/Sasablue - 匿名的好友.mp3"
        },
        {
            title: "去见你",
            artist: "徐秉龙",
            cover: baseUrl + "assets/music/cover/徐秉龙 - 去见你.jpg",
            audio: baseUrl + "assets/music/徐秉龙 - 去见你.mp3"
        },
        {
            title: "デート",
            artist: "RADWIMPS",
            cover: baseUrl + "assets/music/cover/RADWIMPS - デート.jpg",
            audio: baseUrl + "assets/music/RADWIMPS - デート.mp3"
        },
        {
            title: "我们俩",
            artist: "郭顶",
            cover: baseUrl + "assets/music/cover/郭顶 - 我们俩.png",
            audio: baseUrl + "assets/music/郭顶 - 我们俩.mp3"
        },
    ];

    function getCurrentMusicIndex(src) {
        if (!src) return -1;
        
        for (let i = 0; i < musicList.length; i++) {
            const musicFileName = musicList[i].audio.split('/').pop();
            if (src.includes(encodeURIComponent(musicFileName)) || 
                src.includes(musicFileName)) {
                return i;
            }
        }
        return -1;
    }

    function getRandomMusic() {
        // 当前播放的音乐索引
        const currentSrc = document.getElementById('music-player').src;
        const currentIndex = getCurrentMusicIndex(currentSrc);
        
        // 从剩余音乐中随机选择一首
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * musicList.length);
        } while (newIndex === currentIndex && musicList.length > 1);
        
        return { music: musicList[newIndex], index: newIndex };
    }

    function loadMusic(index, position = 0, autoplay = true) {
        const music = musicList[index];

        const blurredBackground0 = document.getElementById('blurred-background0');
        blurredBackground0.style.backgroundImage = `url('${music.cover}')`;
        const blurredBackground1 = document.getElementById('blurred-background1');
        blurredBackground1.style.backgroundImage = `url('${music.cover}')`;

        const coverImage = document.getElementById('music-cover');
        coverImage.src = music.cover;

        const musicInfo = document.getElementById('music-info');
        musicInfo.textContent = `${music.title} - ${music.artist}`;

        const musicPlayer = document.getElementById('music-player');
        
        // 检查是否需要更换音乐源
        if (getCurrentMusicIndex(musicPlayer.src) !== index) {
            musicPlayer.src = music.audio;
        }
        
        // 设置播放位置
        musicPlayer.currentTime = position;
        
        // 根据需要自动播放
        if (autoplay) {
            musicPlayer.play().catch(error => {
                console.log('Auto-play prevented:', error);
                // 设置UI状态为暂停
                rotatingDiv.style.animationPlayState = 'paused';
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            });
        }
        
        // 保存当前播放的音乐索引
        sessionStorage.setItem('currentMusicIndex', index);
    }

    function loadRandomMusic() {
        const { music, index } = getRandomMusic();

        const blurredBackground0 = document.getElementById('blurred-background0');
        blurredBackground0.style.backgroundImage = `url('${music.cover}')`;
        const blurredBackground1 = document.getElementById('blurred-background1');
        blurredBackground1.style.backgroundImage = `url('${music.cover}')`;

        const coverImage = document.getElementById('music-cover');
        coverImage.src = music.cover;

        const musicInfo = document.getElementById('music-info');
        musicInfo.textContent = `${music.title} - ${music.artist}`;

        const musicPlayer = document.getElementById('music-player');
        musicPlayer.src = music.audio;
        musicPlayer.play().catch(error => {
            console.log('Auto-play prevented:', error);
        });
        
        // 保存当前播放的音乐索引
        sessionStorage.setItem('currentMusicIndex', index);
        sessionStorage.setItem('musicPosition', 0);
    }

    const rotatingDiv = document.querySelector('.rotating-img');
    const musicPlayer = document.getElementById('music-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const volumeBtn = document.getElementById('volume-btn');
    const nextBtn = document.getElementById('next-btn');

    // const progressBar = document.getElementById('progress-bar');
    // const progressSlider = document.getElementById('progress-slider');
    // const currentTimeDisplay = document.getElementById('current-time');
    // const durationDisplay = document.getElementById('duration');
    
    // // 格式化时间显示（将秒数转为 mm:ss 格式）
    // function formatTime(seconds) {
    //     const mins = Math.floor(seconds / 60);
    //     const secs = Math.floor(seconds % 60);
    //     return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    // }
    
    // // 更新进度条和时间显示
    // musicPlayer.addEventListener('timeupdate', function() {
    //     const duration = musicPlayer.duration;
    //     const currentTime = musicPlayer.currentTime;
        
    //     if (!isNaN(duration)) {
    //         // 更新进度条
    //         const progressPercent = (currentTime / duration) * 100;
    //         progressBar.style.width = progressPercent + '%';
    //         progressSlider.value = progressPercent;
            
    //         // 更新时间显示
    //         currentTimeDisplay.textContent = formatTime(currentTime);
    //         durationDisplay.textContent = formatTime(duration);
    //     }
    // });
    
    // // 当元数据加载完成后设置持续时间
    // musicPlayer.addEventListener('loadedmetadata', function() {
    //     durationDisplay.textContent = formatTime(musicPlayer.duration);
    // });
    
    // // 允许用户通过点击/拖动进度条来更改播放位置
    // progressSlider.addEventListener('input', function() {
    //     const seekTime = (musicPlayer.duration * progressSlider.value) / 100;
    //     progressBar.style.width = progressSlider.value + '%';
    //     musicPlayer.currentTime = seekTime;
    // });

    // 初始化播放器
    function initializePlayer() {
        // 从sessionStorage获取播放信息
        const savedIndex = sessionStorage.getItem('currentMusicIndex');
        const savedPosition = parseFloat(sessionStorage.getItem('musicPosition') || 0);
        const wasPlaying = sessionStorage.getItem('musicIsPlaying') === 'true';
        
        if (savedIndex !== null && !isNaN(savedIndex)) {
            // 加载保存的音乐和位置
            loadMusic(parseInt(savedIndex), savedPosition, wasPlaying);
        } else {
            // 如果没有保存的音乐信息，加载随机音乐
            loadRandomMusic();
        }
        
        // 根据保存的状态设置UI
        if (wasPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            rotatingDiv.style.animationPlayState = 'running';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            rotatingDiv.style.animationPlayState = 'paused';
        }
        
        // 加载音量状态
        const isMuted = sessionStorage.getItem('musicIsMuted') === 'true';
        musicPlayer.muted = isMuted;
        volumeBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    }

    // 定期保存播放位置
    function savePlaybackState() {
        if (!musicPlayer.paused) {
            sessionStorage.setItem('musicPosition', musicPlayer.currentTime);
            sessionStorage.setItem('musicIsPlaying', 'true');
        } else {
            sessionStorage.setItem('musicIsPlaying', 'false');
        }
    }

    // 设置定期保存播放状态
    const saveInterval = setInterval(savePlaybackState, 1000);

    // 在页面卸载时保存播放状态
    window.addEventListener('beforeunload', function() {
        savePlaybackState();
        clearInterval(saveInterval);
    });

    // 初始化播放器
    initializePlayer();

    musicPlayer.addEventListener('play', function() {
        rotatingDiv.style.animationPlayState = 'running';
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        sessionStorage.setItem('musicIsPlaying', 'true');
    });

    musicPlayer.addEventListener('pause', function() {
        rotatingDiv.style.animationPlayState = 'paused';
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        sessionStorage.setItem('musicIsPlaying', 'false');
    });

    playPauseBtn.addEventListener('click', function() {
        if (musicPlayer.paused) {
            musicPlayer.play();
        } else {
            musicPlayer.pause();
        }
    });
    
    let isMuted = musicPlayer.muted;
    volumeBtn.addEventListener('click', function() {
        musicPlayer.muted = !musicPlayer.muted;
        isMuted = !isMuted;
        volumeBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        sessionStorage.setItem('musicIsMuted', isMuted);
    });
    
    nextBtn.addEventListener('click', function() {
        loadRandomMusic();
    });

    musicPlayer.addEventListener('ended', loadRandomMusic);
});