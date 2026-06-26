import { CmdBase } from './CmdBase.js';

export class Fortune extends CmdBase {
    execute(args) {
        const fortunes = [
            '42 is the answer. But what was the question again?',
            'In a world of GUIs, be a terminal.',
            'There is no place like ~',
            'Have you tried turning it off and on again?',
            'Talk is cheap. Show me the code.',
            'Any sufficiently advanced technology is indistinguishable from magic.',
            "It\’s not a bug \— it\’s an undocumented feature.",
            'The best way to predict the future is to invent it.',
            'First, solve the problem. Then, write the code.',
            'Debugging is twice as hard as writing the code in the first place.',
            '\千\里\之\行\，\始\於\足\下\。',
            '\学\而\不\思\則\罠\，\思\而\不\学\則\殆\。',
            '\己\所\不\欲\，\勿\施\於\人\。',
            '\温\故\而\知\新\，\可\以\為\師\矣\。',
            '\三\人\行\，\必\有\我\師\焉\。',
            '\天\行\健\，\君\子\以\自\强\不\息\。',
            '\不\以\物\喜\，\不\以\己\悲\。',
            '\人\生\如\逆\旅\，\我\亦\是\行\人\。',
            '\生\活\就\像\海\洋\，\只\有\意\志\堅\強\的\人\才\能\到\達\彼\岸\。',
            '\上\善\若\水\，\水\善\利\萬\物\而\不\争\。',
            '\美\丽\的\花\儿\，\如\果\缺\少\伴\侶\，\也\是\孤\单\的\。',
            '\七\車\び\八\起\き\り',
            '\猿\も\木\か\ら\落\ち\る',
            '\継\続\は\力\な\り',
            '\花\よ\り\団\子',
            '\時\は\金\な\り',
            '\急\が\ば\回\れ',
            '\郷\に\入\っ\て\は\郷\に\従\え',
            '\明\日\は\明\日\の\風\が\吹\く',
            '\塵\も\積\も\れ\ば\山\と\な\る',
            '\虎\穴\に\入\ら\ず\ん\ば\虎\子\を\得\ず',
        ];
        this.print(fortunes[Math.floor(Math.random() * fortunes.length)] + '\n');
    }
    static get commandName() { return 'fortune'; }
    static get help() { return 'Show a random fortune'; }
    static get menu() { return 'Random Fortune'; }
}
