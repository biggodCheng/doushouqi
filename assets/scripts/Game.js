const ResUtils = require("./gameFrame/ResUtils");
const GameConst = require("GameConst");

const mvs = require('./macthvs/Mvs')
const MvsConfig = require('./macthvs/MvsConfig')

cc.Class({
    extends: cc.Component,

    properties: {
        //地图节点
        mapNode: {
            default: null,
            type: cc.Node
        },

        //header信息
        header: {
            default: null,
            type: cc.Node
        },

        //当前游戏描述
        curDesc: {
            default: null,
            type: cc.Sprite
        }
    },

    onLoad() {
        //第一次进入初始化数据
        this.initMapData();
        //注册事件监听
        this.registerEvent();

        if (cc.global.isLianwang) {
            mvs.response.sendEventNotify = this.sendEventNotify.bind(this);
        }

    },

    sendEventNotify: function (info) {
        if (info && info.cpProto) {
            var data = JSON.parse(info.cpProto).data;
            if (info.cpProto.indexOf('openCard') >= 0) {
                this.node.emit('openCard', data);
            } else if (info.cpProto.indexOf('moveCard') >= 0) {
                this.node.emit('moveCard', data);
            } else if (info.cpProto.indexOf('gameOver') >= 0) {
                this.node.emit('gameOver', data);
            } else if (info.cpProto.indexOf('ready') >= 0) {
                if (!this.readyPlayers) {
                    this.readyPlayers = [];
                }

                if (this.readyPlayers.indexOf(data.userId) < 0) {
                    this.readyPlayers.push(data.userId);
                    //只有房主才能开始游戏
                    if (this.readyPlayers.length == 2 && cc.global.isRoomOwner) {
                        var cardData = GameConst.getCardData();
                        cardData.shuffle();
                        var eventData = {
                            firstPlayerType: Math.random2(1, 2),
                            cardData: cardData
                        };

                        cc.global.firstPlayerType = eventData.firstPlayerType;
                        cc.global.cardData = eventData.cardData;

                        this.node.emit('gameStart');
                        this.sendMvsEvent('reStart', eventData);
                    }
                }
            } else if (info.cpProto.indexOf('reStart') >= 0) {

                cc.global.firstPlayerType = data.firstPlayerType;
                cc.global.cardData = data.cardData;

                this.node.emit('gameStart');
            }
            delete cc.global.events[info.sequence];
        }
    },

    start() {
        //游戏数据
        this.gameData = {};
        this.node.emit('gameStart');
    },

    /**
     * 初始化 地图数据
     */
    initMapData() {
        this._mapInfo = [];
        for (var i = 0; i < 4; i++) {
            var arr = [];
            this._mapInfo[i] = arr;
            for (var j = 0; j < 4; j++) {
                var cardNode = this.mapNode.getChildByName(`card_${i}_${j}`);
                cardNode.on('click', this.onCardSelect, this);
                var cardInfo = {
                    node: cardNode, //每次移动后交换node，其他数据只做初始化使用
                    idx: [i, j],
                    initPos: cardNode.position,
                    state: GameConst.CardState.CardBack,
                    type: 0,
                    value: 0,
                };
                arr[j] = cardInfo;
            }
        }
    },

    /**
     * 游戏开始
     */
    gameStart() {
        this.gameData.state = GameConst.GameState.Start;
        //设置玩家信息
        this.setPlayerInfo();
        //重置卡牌数据
        this.resetCardData();
        //随机先手玩家
        if (cc.global.isLianwang) {
            this.gameData.curPlayerType = cc.global.firstPlayerType;
        } else {
            this.gameData.curPlayerType = Math.random2(1, 2);
        }

        this.showFisrtToast();

        this.selectedCard = null;
        this.curCard = null;
        this.readyPlayers = [];

    },

    /**
     * 设置玩家信息
     */
    setPlayerInfo() {
        //双方阵营数据
        this.gameData.user = {};
        this.gameData.other = {};

        //对战信息背景
        var bg = this.header.getChildByName('bg');
        //对战信息显示
        var user1 = this.header.getChildByName('info1');
        var user2 = this.header.getChildByName('info2');

        if (cc.global.isLianwang) {

            cc.global.playerUserList.forEach((userInfo) => {
                if (userInfo.userId == cc.global.userInfo.id) {
                    this.gameData.user.userId = userInfo.userId;
                    this.gameData.user.playerType = userInfo.playerType;

                    if (userInfo.playerType == GameConst.PlayerType.Blue) {
                        bg.scaleX = -1;
                    } else {
                        bg.scaleX = 1;
                    }
                    var headFrame1 = user1.getChildByName('head_frame');
                    ResUtils.setSpriteFrame(headFrame1, "image/head_" + userInfo.playerType);
                    var head1 = user1.getChildByName('head').getChildByName('image');
                    ResUtils.setSpriteFrame(head1, "image/animal_" + userInfo.head);

                    var name1 = user1.getChildByName('name').getComponent(cc.Label);
                    name1.string = userInfo.name;

                    ResUtils.setSpriteFrame(user1.getChildByName('sex'), "image/sex_" + userInfo.sex);
                } else {
                    this.gameData.other.userId = userInfo.userId;
                    this.gameData.other.playerType = userInfo.playerType;
                    var headFrame2 = user2.getChildByName('head_frame');
                    ResUtils.setSpriteFrame(headFrame2, "image/head_" + userInfo.playerType);
                    var head2 = user2.getChildByName('head').getChildByName('image');
                    ResUtils.setSpriteFrame(head2, "image/animal_" + userInfo.head);

                    var name2 = user2.getChildByName('name').getComponent(cc.Label);
                    name2.string = userInfo.name;

                    ResUtils.setSpriteFrame(user2.getChildByName('sex'), "image/sex_" + userInfo.sex);
                }

            });

        } else {
            //设置双方颜色阵营
            this.gameData.user.playerType = GameConst.PlayerType.Red;
            this.gameData.other.playerType = GameConst.PlayerType.Blue;
            //对战信息背景
            bg.scaleX = 1;
            //对战信息显示
            var user1 = this.header.getChildByName('info1');
            var user2 = this.header.getChildByName('info2');
            //头像框颜色设置
            var headFrame1 = user1.getChildByName('head_frame');
            ResUtils.setSpriteFrame(headFrame1, "image/head_" + GameConst.PlayerType.Red);

            var headFrame2 = user2.getChildByName('head_frame');
            ResUtils.setSpriteFrame(headFrame2, "image/head_" + GameConst.PlayerType.Blue);

            //头像
            var head1 = user1.getChildByName('head').getChildByName('image');
            ResUtils.setSpriteFrame(head1, "image/animal_" + Math.random2(1, 8));

            var head2 = user2.getChildByName('head').getChildByName('image');
            ResUtils.setSpriteFrame(head2, "image/animal_" + Math.random2(1, 8));

            //名称、性别
            var name1 = user1.getChildByName('name').getComponent(cc.Label);
            var name2 = user2.getChildByName('name').getComponent(cc.Label);

            if (cc.global.isDanRenDanJi) {
                name1.string = '自己';
                name2.string = '电脑';
            } else {
                name1.string = '红方';
                name2.string = '蓝方';
            }

            ResUtils.setSpriteFrame(user1.getChildByName('sex'), "image/sex_" + Math.random2(1, 2));
            ResUtils.setSpriteFrame(user2.getChildByName('sex'), "image/sex_" + Math.random2(1, 2));
        }

    },

    /**
     * 重置卡牌数据
     */
    resetCardData() {

        var cardData;
        if (cc.global.isLianwang) {
            cardData = cc.global.cardData;
        } else {
            cardData = this.randomCardData();
        }

        var idx = 0;
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                var data = cardData[idx];

                var cardInfo = this._mapInfo[i][j];
                var card = cardInfo.node.getComponent('Card');
                cardInfo.state = GameConst.CardState.CardBack;
                //红蓝类型
                cardInfo.type = parseInt(data / 100);
                //动物类型、名称
                cardInfo.value = parseInt(data % 100);
                //设置card数据
                card.setCardDataByInfo(cardInfo);

                idx++;
            }
        }
        return cardData;
    },

    /**
     * 随机卡牌 数据
     */
    randomCardData() {
        var cardData = GameConst.getCardData();
        cardData.shuffle();
        return cardData;
    },

    /**
     * 认输事件
     */
    onRenShuClick() {
        //临时使用
        if (!cc.global.isLianwang) {
            this.node.emit('gameStart');
        } else {
            if (!this.readyPlayers) {
                this.readyPlayers = [];
            }
            this.readyPlayers.push(cc.global.userInfo.id);

            //只有房主才能开始游戏
            if (this.readyPlayers.length == 2 && cc.global.isRoomOwner) {

                var cardData = GameConst.getCardData();
                cardData.shuffle();
                var eventData = {
                    firstPlayerType: Math.random2(1, 2),
                    cardData: cardData
                };

                cc.global.firstPlayerType = eventData.firstPlayerType;
                cc.global.cardData = eventData.cardData;

                this.node.emit('gameStart');
                this.sendMvsEvent('reStart', eventData);
            } else {
                //发送准备消息
                this.sendMvsEvent('ready', {
                    userId: cc.global.userInfo.id,
                });
            }


        }

    },

    /**
     * 卡牌被点击
     */
    onCardSelect(event) {

        if (this.gameData.state != GameConst.GameState.Gaming) {
            return;
        }

        //双人单机版
        if (!cc.global.isShuangRenDanJi) {
            if (this.gameData.curPlayerType != this.gameData.user.playerType) {
                //不是自己的回合,不处理
                this.showToast('对手的回合');
                return;
            }
        }

        var card = event.target.getComponent('Card');
        //存在选中的牌
        if (this.selectedCard) {
            if (this.selectedCard.idx[0] == card.idx[0] &&
                this.selectedCard.idx[1] == card.idx[1]) {
                //同一张牌
                this.selectedCard.node.setLocalZOrder(0);
                this.selectedCard.showCanMoveOrientation();
                this.selectedCard.node.scale = 1;
                this.selectedCard = null;
                return;
            }


            var validPos = function () {
                //判断是否为选中牌的周边牌
                var cardArr = this.getUpDownLeftRightCard(this.selectedCard);

                for (var i = 0; i < cardArr.length; i++) {
                    var item = cardArr[i];
                    if (item) {
                        if (item.idx[0] == card.idx[0] && item.idx[1] == card.idx[1]) {
                            return true;
                        }
                    }
                }
                return false;
            }

            var isValidPos = validPos.bind(this)();

            if (isValidPos) {
                if (card.state == GameConst.CardState.Invalid) {

                    /**
                      * 0 一样大
                      * 1 可通行
                      * 2 可吃
                      * 3 被吃
                      */
                    this.node.emit('moveCard', {
                        selectedIdx: this.selectedCard.idx,
                        moveIdx: card.idx,
                        compareValue: 1
                    });

                    this.sendMvsEvent('moveCard', {
                        selectedIdx: this.selectedCard.idx,
                        moveIdx: card.idx,
                        compareValue: 1
                    });

                    return;
                }

                if (card.state == GameConst.CardState.CardFace
                    && card.cardType != this.gameData.curPlayerType) {


                    //判断大小：吃牌、自杀、同归于尽
                    var compareValue = this.compareCard(this.selectedCard, card);

                    this.node.emit('moveCard', {
                        selectedIdx: this.selectedCard.idx,
                        moveIdx: card.idx,
                        compareValue: compareValue
                    });

                    this.sendMvsEvent('moveCard', {
                        selectedIdx: this.selectedCard.idx,
                        moveIdx: card.idx,
                        compareValue: compareValue
                    });

                    return;
                }
            }


            this.showToast('无法移动');
            return;
        }

        if (card.state == GameConst.CardState.CardFace
            && card.cardType != this.gameData.curPlayerType) {
            this.showToast('这是对手的牌');
            return;
        }

        if (card.state == GameConst.CardState.CardBack) {
            this.node.emit('openCard', { cardIdx: card.idx });
            this.sendMvsEvent('openCard', { cardIdx: card.idx });
        }

        if (card.state == GameConst.CardState.CardFace) {
            //判断可移动方位:上下左右
            var orientations = [];
            var closeCount = 0;

            var cardArr = this.getUpDownLeftRightCard(card);
            for (var i = 0; i < cardArr.length; i++) {
                var item = cardArr[i];
                if (item) {
                    var compareValue = this.compareCard(card, item);
                    if (compareValue == 1 || compareValue == 2) {
                        orientations.push(GameConst.MoveType.Open);
                    } else if (compareValue == -1) {
                        orientations.push(GameConst.MoveType.Close);
                        closeCount++;
                    } else {
                        orientations.push(GameConst.MoveType.Die);
                    }
                } else {
                    orientations.push(GameConst.MoveType.Close);
                    closeCount++;
                }
            }

            if (closeCount == 4) {
                this.showToast('无法移动');
                return;
            }

            event.target.scale = 1.1;
            event.target.setLocalZOrder(99);
            card.showCanMoveOrientation(orientations);
            this.selectedCard = card;
        }

    },

    gameOver(card) {
        card.setCardState(GameConst.CardState.CardFace);
        card.showWinTag(() => {
            //展示结束面板

        });
    },

    throwTurn(card) {
        var that = this;
        this.gameData.curPlayerType = 3 - this.gameData.curPlayerType;
        if (this.curCard) {
            this.curCard.setUpTagVisble(false);
        }
        this.curCard = card;
        this.curCard.setUpTagVisble(true);
        if (this.gameData.curPlayerType == this.gameData.user.playerType) {
            //变亮能选择的卡牌
            for (var i = 0; i < 4; i++) {
                for (var j = 0; j < 4; j++) {
                    var cardInfo = this._mapInfo[i][j];
                    var cardScript = this._mapInfo[i][j].node.getComponent('Card');
                    if (cardScript.state == GameConst.CardState.CardBack) {
                        cardScript.setCanSelectState(true);
                    } else if (cardScript.state == GameConst.CardState.CardFace &&
                        cardScript.cardType == this.gameData.curPlayerType) {
                        cardScript.setCanSelectState(true);
                    } else {
                        cardScript.setCanSelectState(false);
                    }
                }
            }
            this.showToast('你的回合');
        } else {
            //变暗所有卡牌
            for (var i = 0; i < 4; i++) {
                for (var j = 0; j < 4; j++) {
                    var cardInfo = this._mapInfo[i][j];
                    var cardScript = this._mapInfo[i][j].node.getComponent('Card');
                    cardScript.setCanSelectState(false);
                }
            }
            this.showToast('对手的回合');
            if (cc.global.isDanRenDanJi) {
                that.scheduleOnce(() => {
                    that.startAIAction();
                }, 1);
            }
        }
    },

    getUpDownLeftRightCard(card) {
        var idxV = card.idx[0];
        var idxH = card.idx[1];

        var idxUp = idxV - 1;
        var idxDown = idxV + 1;
        var idxLeft = idxH - 1;
        var idxRight = idxH + 1;

        //获取上下左右的卡牌状态
        var upCard = idxUp < 0 ? null : this._mapInfo[idxUp][idxH].node.getComponent('Card');
        var downCard = idxDown > 3 ? null : this._mapInfo[idxDown][idxH].node.getComponent('Card');
        var leftCard = idxLeft < 0 ? null : this._mapInfo[idxV][idxLeft].node.getComponent('Card');
        var rightCard = idxRight > 3 ? null : this._mapInfo[idxV][idxRight].node.getComponent('Card');

        var cardArr = [upCard, downCard, leftCard, rightCard];
        return cardArr;
    },

    /**
     * card1 与 card2 比较
     * -1 不可通行
     * 0 一样大
     * 1 可通行
     * 2 可吃
     * 3 被吃
     * @param card1 
     * @param card2 
     */
    compareCard(card1, card2) {
        if (!card1 || !card2) {
            return -1;
        }
        //无效状态
        if (card2.state == GameConst.CardState.Invalid) {
            return 1;
        } else if (card2.state == GameConst.CardState.CardBack
            || card2.cardType == card1.cardType) {
            return -1;
        } else {
            if (card2.cardValue > card1.cardValue) {
                if (card2.cardValue == GameConst.AnimalType.Xiang &&
                    card1.cardValue == GameConst.AnimalType.Shu) {
                    //鼠吃象
                    return 2;
                }
                return 3;
            } else if (card2.cardValue == card1.cardValue) {
                //拼了
                return 0;
            } else {
                if (card2.cardValue == GameConst.AnimalType.Shu &&
                    card1.cardValue == GameConst.AnimalType.Xiang) {
                    //鼠吃象
                    return 3;
                }
                return 2;
            }
        }
    },

    /**
     * 先手玩家显示
     */
    showFisrtToast() {
        var that = this;
        var playerType = this.gameData.curPlayerType;
        ResUtils.instantiate("prefabs/gameToast", (node) => {
            var toast = node.getComponent('Toast');
            ResUtils.setSpriteFrame(toast.node, "image/bg_toast_" + playerType, (node) => {
                that.node.addChild(node);
                if (this.gameData.user.playerType == playerType) {
                    toast.show('你的回合', () => {
                        //点亮所有卡牌
                        for (var i = 0; i < 4; i++) {
                            for (var j = 0; j < 4; j++) {
                                var cardInfo = this._mapInfo[i][j];
                                var card = this._mapInfo[i][j].node.getComponent('Card');
                                card.setCanSelectState(true);
                            }
                        }
                        this.gameData.state = GameConst.GameState.Gaming;
                    });
                } else {
                    toast.show('对手的回合', () => {
                        this.gameData.state = GameConst.GameState.Gaming;
                        if (cc.global.isDanRenDanJi) {
                            that.scheduleOnce(() => {
                                that.startAIAction();
                            }, 1);
                        }
                    });

                }
            });
        });

    },

    showToast(content) {
        var that = this;
        ResUtils.instantiate("prefabs/gameToast", (node) => {
            var toast = node.getComponent('Toast');
            ResUtils.setSpriteFrame(toast.node,
                "image/bg_toast_" + this.gameData.curPlayerType,
                (node) => {
                    that.node.addChild(node);
                    toast.show(content);
                });
        });
    },

    isGameOver() {
        var validCard = [];
        var blueCount = 0;
        var redCount = 0;
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                var cardInfo = this._mapInfo[i][j];
                var cardScript = this._mapInfo[i][j].node.getComponent('Card');

                if (cardScript.state == GameConst.CardState.CardBack) {
                    return { over: false };
                }

                if (cardScript.state == GameConst.CardState.Invalid) {
                    if (cardScript.cardType == GameConst.PlayerType.Red) {
                        redCount++;
                    } else {
                        blueCount++;
                    }
                } else {
                    validCard.push(cardScript);
                }
            }
        }
        //游戏结束
        if (redCount == 8 || blueCount == 8) {
            this.gameData.state = GameConst.GameState.End;
            return { over: true, validCard: validCard };
        }
        return { over: false };
    },

    registerEvent() {
        this.node.on('gameStart', (event) => {
            this.gameStart();
        });
        this.node.on('openCard', (event) => {
            var card = this._mapInfo[event.detail.cardIdx[0]][event.detail.cardIdx[1]].node.getComponent('Card');
            card.shake((() => {

                var overIfo = this.isGameOver.bind(this)()
                if (overIfo.over) {
                    var winCard = card;
                    this.node.emit('gameOver', { cardIdx: winCard.idx });
                    this.sendMvsEvent('gameOver', { cardIdx: winCard.idx });
                } else {
                    this.throwTurn(card);
                }

            }));
        });
        this.node.on('moveCard', (event) => {

            var selectedCard = this._mapInfo[event.detail.selectedIdx[0]][event.detail.selectedIdx[1]].node.getComponent('Card');
            var card = this._mapInfo[event.detail.moveIdx[0]][event.detail.moveIdx[1]].node.getComponent('Card');

            /**
             * 0 一样大
             * 1 可通行
             * 2 可吃
             * 3 被吃
             */
            var compareValue = event.detail.compareValue;

            selectedCard.node.scale = 1.1;
            selectedCard.node.setLocalZOrder(99);

            var pos = selectedCard.node.position;
            var animationPos = pos;
            selectedCard.moveToPos(card.node.position, () => {

                if (compareValue != 1) {
                    ResUtils.instantiate("prefabs/animal_die", (node) => {
                        node.position = animationPos;
                        this.mapNode.addChild(node);
                        node.runAction(cc.sequence(cc.delayTime(0.5), cc.callFunc(() => {
                            ResUtils.destroy(node);
                        })));
                    });
                }

                var winCard = null;

                if (compareValue == 3) {
                    selectedCard.setCardState(GameConst.CardState.Invalid);
                    selectedCard.node.position = pos;
                    animationPos = card.node.position;

                    var overIfo = this.isGameOver.bind(this)()
                    if (overIfo.over) {
                        winCard = card;
                    }
                } else if (compareValue == 0) {
                    selectedCard.setCardState(GameConst.CardState.Invalid);
                    card.setCardState(GameConst.CardState.Invalid);
                    selectedCard.node.position = pos;
                    animationPos = card.node.position;

                    var overIfo = this.isGameOver.bind(this)()
                    if (overIfo.over) {
                        if (overIfo.validCard.length > 0) {
                            winCard = overIfo.validCard[0];
                        } else {
                            winCard = selectedCard;
                        }
                    }
                } else {
                    card.node.position = pos;

                    if (compareValue == 2) {
                        card.setCardState(GameConst.CardState.Invalid);
                    }

                    [this._mapInfo[card.idx[0]][card.idx[1]].node,
                    this._mapInfo[selectedCard.idx[0]][selectedCard.idx[1]].node] =
                        [selectedCard.node, card.node];
                    [card.idx, selectedCard.idx] = [selectedCard.idx, card.idx];

                    animationPos = selectedCard.node.position;

                    var overIfo = this.isGameOver.bind(this)()
                    if (overIfo.over) {
                        winCard = selectedCard;
                    }
                }

                selectedCard.node.setLocalZOrder(0);
                selectedCard.showCanMoveOrientation();
                selectedCard.node.scale = 1;
                if (winCard) {
                    this.node.emit('gameOver', { cardIdx: winCard.idx });
                } else {
                    this.throwTurn(selectedCard);
                    this.selectedCard = null;
                }

            });

        });
        this.node.on('gameOver', (event) => {
            var card = this._mapInfo[event.detail.cardIdx[0]][event.detail.cardIdx[1]].node.getComponent('Card');
            this.gameOver(card);
        });
    },

    /**
     * 开始AI动作
     */
    startAIAction() {
        //单人单机玩法
        if (cc.global.isDanRenDanJi) {
            //简单AI
            var canOpenArr = [];
            var canMoveArr = [];
            var canChiArr = [];
            var canPinArr = [];
            var canDieArr = [];

            for (var i = 0; i < 4; i++) {
                for (var j = 0; j < 4; j++) {
                    var cardInfo = this._mapInfo[i][j];
                    var cardScript = this._mapInfo[i][j].node.getComponent('Card');

                    if (cardScript.state == GameConst.CardState.CardBack) {
                        canOpenArr.push({ card: cardScript });
                    }
                    //AI固定为蓝方
                    if (cardScript.cardType == GameConst.PlayerType.Blue) {
                        if (cardScript.state == GameConst.CardState.CardFace) {
                            var cardArr = this.getUpDownLeftRightCard(cardScript);
                            for (var k = 0; k < cardArr.length; k++) {
                                var item = cardArr[k];
                                if (item) {
                                    var compareValue = this.compareCard(cardScript, item);
                                    if (compareValue == 0) {
                                        canPinArr.push({ card: cardScript, pinCard: item, compareValue: compareValue });
                                    } else if (compareValue == 1) {
                                        canMoveArr.push({ card: cardScript, moveCard: item, compareValue: compareValue });
                                    } else if (compareValue == 2) {
                                        canChiArr.push({ card: cardScript, chiCard: item, compareValue: compareValue });
                                    } else if (compareValue == 3) {
                                        canDieArr.push({ card: cardScript, killerCard: item, compareValue: compareValue });
                                    }
                                }
                            }
                        }

                    }
                }
            }
            //走能吃的，从最大的吃
            if (canChiArr.length > 1) {
                canChiArr.sort(function (a, b) {
                    if (a.chiCard.cardValue > b.chiCard.cardValue) {
                        return -1;
                    }
                    return 1;
                });
            }
            if (canChiArr.length > 0) {
                //移动
                this.node.emit('moveCard', {
                    selectedIdx: canChiArr[0].card.idx,
                    moveIdx: canChiArr[0].chiCard.idx,
                    compareValue: canChiArr[0].compareValue
                });
                return;
            }
            //走能拼的，从最大的拼
            if (canPinArr.length > 1) {
                canPinArr.sort(function (a, b) {
                    if (a.pinCard.cardValue > b.pinCard.cardValue) {
                        return -1;
                    }
                    return 1;
                });
            }
            if (canPinArr.length > 0) {
                //移动
                this.node.emit('moveCard', {
                    selectedIdx: canPinArr[0].card.idx,
                    moveIdx: canPinArr[0].pinCard.idx,
                    compareValue: canPinArr[0].compareValue
                });
                return;
            }
            //走能走的，随机
            if (canMoveArr.length > 0) {
                var idx = Math.random2(0, canMoveArr.length - 1);
                this.node.emit('moveCard', {
                    selectedIdx: canMoveArr[idx].card.idx,
                    moveIdx: canMoveArr[idx].moveCard.idx,
                    compareValue: canMoveArr[idx].compareValue
                });
                return;
            }

            //翻牌，随机
            if (canOpenArr.length > 0) {
                var idx = Math.random2(0, canOpenArr.length - 1);
                //开牌
                this.node.emit('openCard', { cardIdx: canOpenArr[idx].card.idx });
                return;
            }
            //从小的开始自杀
            if (canDieArr.length > 1) {
                canDieArr.sort(function (a, b) {
                    if (a.card.cardValue > b.card.cardValue) {
                        return 1;
                    }
                    return -1;
                });
            }
            if (canDieArr.length > 0) {
                //移动
                this.node.emit('moveCard', {
                    selectedIdx: canDieArr[0].card.idx,
                    moveIdx: canDieArr[0].killerCard.idx,
                    compareValue: canDieArr[0].compareValue
                });
                return;
            }

        }

    },

    sendMvsEvent(eventCode, data) {
        if (cc.global.isLianwang) {
            var event = {
                action: eventCode,
                data: data
            };

            var result = mvs.engine.sendEvent(JSON.stringify(event));
            if (result.result !== 0) {
                cc.log('发送消息失败，错误码' + result.result)
                return;
            }
            cc.global.events[result.sequence] = event;
        }
    }




});
