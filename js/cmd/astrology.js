import { CmdBase } from './CmdBase.js';
import { cyan, bold, green, yellow, white, red } from '../sgr.js';

export class AstrologyCmd extends CmdBase {
    execute(args) {
        this.open();
        this.print('\r\n' + bold(cyan('=== 今日星座運勢 ===')) + '\r\n');
        this._pickSign();
    }

    _pickSign() {
        this.select({
            text: yellow('請選擇你的星座（方向鍵移動，Enter 確認，Esc 取消）') + '\r\n',
            options: [
                ['牡羊座', '金牛座', '雙子座', '巨蟹座'],
                ['獅子座', '處女座', '天秤座', '天蠍座'],
                ['射手座', '摩羯座', '水瓶座', '雙魚座'],
            ],
            onPick: (row, col, value) => {
                this.term.write('\r\n\r\n');
                this.showFortune(row * 4 + col);
            },
        });
    }

    showFortune(signIdx) {
        const signName = ZODIAC[signIdx];
        const items = _fortune(signIdx);
        this.isTyping = true;

        this.print(bold(yellow('==================================================')) + '\r\n');
        this.print(bold(cyan('            ' + signName + ' 今日運勢')) + '\r\n');
        this.print(bold(yellow('==================================================')) + '\r\n');
        for (const item of items) {
            const color = item.score >= 4 ? green : item.score >= 3 ? yellow : white;
            this.print('  ' + item.cat + '  ' + color(item.stars + '  ' + item.desc) + '\r\n');
        }
        this.print(bold(yellow('==================================================')) + '\r\n\r\n');

        this.printThen('', () => {
            this.isTyping = false;
            this.close();
        });
    }

    onCancel() {
        this.term.write('\r\n' + red('^C 已取消') + '\r\n');
        this.close();
    }

    static get commandName() { return 'astrology'; }
    static get help() { return 'Today\'s horoscope for your zodiac sign'; }
    static get menu() { return 'Astrology Horoscope'; }
}
