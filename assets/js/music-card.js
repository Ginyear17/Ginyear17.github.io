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
        }
    ];

    function getRandomMusic() {
        // 当前播放的音乐索引
        const currentSrc = document.getElementById('music-player').src;
        let currentIndex = -1;
        
        // 查找当前播放的音乐在列表中的索引
        for (let i = 0; i < musicList.length; i++) {
            // 使用音乐文件名的最后部分进行比较
            const musicFileName = musicList[i].audio.split('/').pop();
            if (currentSrc.includes(encodeURIComponent(musicFileName)) || 
                currentSrc.includes(musicFileName)) {
                currentIndex = i;
                break;
            }
        }
        

        // 从剩余音乐中随机选择一首
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * musicList.length);
        } while (newIndex === currentIndex && musicList.length > 1);
        
        return musicList[newIndex];
    }

    function loadRandomMusic() {
        const music = getRandomMusic();

        const coverImage = document.getElementById('music-cover');
        coverImage.src = music.cover;

        const musicInfo = document.getElementById('music-info');
        musicInfo.textContent = `${music.title} - ${music.artist}`;

        const musicPlayer = document.getElementById('music-player');
        musicPlayer.src = music.audio;
        musicPlayer.play();  // 自动播放新音乐
    }

    loadRandomMusic();

    const rotatingDiv = document.querySelector('.rotating-img');
    const musicPlayer = document.getElementById('music-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const volumeBtn = document.getElementById('volume-btn');
    const nextBtn = document.getElementById('next-btn');

    // 确保初始状态显示为暂停
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    // 确保唱片初始状态为静止
    rotatingDiv.style.animationPlayState = 'paused';

    musicPlayer.addEventListener('play', function() {
        rotatingDiv.style.animationPlayState = 'running';
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });

    musicPlayer.addEventListener('pause', function() {
        rotatingDiv.style.animationPlayState = 'paused';
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });

    playPauseBtn.addEventListener('click', function() {
        if (musicPlayer.paused) {
            musicPlayer.play();
        } else {
            musicPlayer.pause();
        }
    });
    
    let isMuted = false;
    volumeBtn.addEventListener('click', function() {
        musicPlayer.muted = !musicPlayer.muted;
        isMuted = !isMuted;
        volumeBtn.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    });
    
    nextBtn.addEventListener('click', function() {
        loadRandomMusic();
    });

    musicPlayer.addEventListener('ended', loadRandomMusic);
});