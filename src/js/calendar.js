// 侧栏日历卡片：实时时间 / 日期 / 欢迎语 / 农历
// 农历计算依赖 lunar.js 提供的全局 Lunar（在 HTML 中以经典 <script> 引入，先于本模块执行）
export function initCalendar() {
    function updateDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 月份从 0 开始，所以需要加 1
        const day = now.getDate();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekDay = weekDays[now.getDay()];
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // 更新日期和时间
        document.getElementById('current-date').textContent = `${year}年${month}月${day}日 星期${weekDay}`;
        document.getElementById('current-time').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // 更新欢迎词
        const welcomeMessages = {
            morning: '早上',
            afternoon: '下午',
            evening: '晚上',
            night: '深夜'
        };

        let welcomeMessage = '';
        if (hours >= 5 && hours < 12) {
            welcomeMessage = welcomeMessages.morning;
        } else if (hours >= 12 && hours < 18) {
            welcomeMessage = welcomeMessages.afternoon;
        } else if (hours >= 18 && hours < 22) {
            welcomeMessage = welcomeMessages.evening;
        } else {
            welcomeMessage = welcomeMessages.night;
        }

        document.getElementById('welcome-message').textContent = welcomeMessage;

        // 计算并更新农历日期
        const lunarDate = Lunar.fromDate(now);
        document.getElementById('lunar-date').textContent = `${lunarDate.getMonthInChinese()}月${lunarDate.getDayInChinese()}`;
    }

    // 每秒更新一次日期和时间，并立即初始化一次
    updateDateTime();
    setInterval(updateDateTime, 1000);
}
