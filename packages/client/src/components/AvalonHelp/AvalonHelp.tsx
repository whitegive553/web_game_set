/**
 * Avalon Help Modal
 * Displays game rules, role information, and FAQ
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './AvalonHelp.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'rules' | 'roles' | 'faq';

export const AvalonHelp: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('rules');

  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal-content" onClick={e => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>{t('avalonHelp.title')}</h2>
          <button className="help-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="help-tabs">
          <button
            className={`help-tab ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            {t('avalonHelp.tabs.rules')}
          </button>
          <button
            className={`help-tab ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            {t('avalonHelp.tabs.roles')}
          </button>
          <button
            className={`help-tab ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            {t('avalonHelp.tabs.faq')}
          </button>
        </div>

        <div className="help-content">
          {activeTab === 'rules' && <GameRules />}
          {activeTab === 'roles' && <RoleInfo />}
          {activeTab === 'faq' && <FAQ />}
        </div>
      </div>
    </div>
  );
};

const GameRules: React.FC = () => (
  <div className="help-section">
    <h3>🎮 游戏规则</h3>
    <p>阿瓦隆是一款 <strong>阵营对抗 + 隐藏身份</strong> 的多人推理游戏。<br />
    游戏分为 <strong>红、蓝两大阵营</strong>，玩家需要通过讨论、投票和判断来达成阵营目标。</p>

    <h4>🏆 胜利条件</h4>

    <div className="victory-section">
      <h5>🔵 蓝方（善良阵营）</h5>
      <ul>
        <li><strong>成功完成 3 次任务</strong></li>
        <li>且 <strong>梅林未被刺客刺杀</strong></li>
      </ul>
    </div>

    <div className="victory-section">
      <h5>🔴 红方（邪恶阵营）</h5>
      <ul>
        <li><strong>累计 3 次任务失败</strong></li>
        <li>或 <strong>连续 5 次组队投票失败（流局）</strong></li>
        <li>或在刺杀阶段 <strong>成功刺杀梅林</strong></li>
      </ul>
    </div>

    <h4>🔄 游戏流程</h4>

    <div className="flow-step">
      <h5>1️⃣ 队长组队</h5>
      <p>当前队长指定本轮执行任务的队员名单，并指定发言讨论方向（顺时针 / 逆时针）。<br />
      队长可以阐述自己的组队思路，或提供相关线索。</p>
    </div>

    <div className="flow-step">
      <h5>2️⃣ 讨论阶段</h5>
      <p>所有玩家按照队长指定的顺序进行发言讨论，表达对本轮组队的看法。</p>
    </div>

    <div className="flow-step">
      <h5>3️⃣ 玩家投票</h5>
      <p>讨论结束后，所有玩家对该队伍进行投票，选择 <strong>赞成 / 反对</strong>：</p>
      <ul>
        <li><strong>超过半数赞成</strong> → 组队通过，进入任务阶段</li>
        <li><strong>未超过半数赞成</strong> → 组队失败，本轮流局，由下一位玩家成为队长</li>
      </ul>
      <p className="notice">若 <strong>累计流局 5 次</strong>，红方阵营 <strong>直接获胜</strong></p>
    </div>

    <div className="flow-step">
      <h5>4️⃣ 执行任务</h5>
      <p>被选中的队员秘密选择执行结果：</p>
      <ul>
        <li><strong>蓝方玩家</strong>：只能选择「任务成功」</li>
        <li><strong>红方玩家</strong>：可以选择「任务成功」或「任务失败」</li>
      </ul>
      <p><strong>任务结果判定：</strong></p>
      <ul>
        <li><strong>全部选择成功</strong> → 任务成功</li>
        <li><strong>出现至少 1 次失败</strong> → 任务失败</li>
      </ul>
      <p className="notice">特殊规则：<br />
      在 <strong>7、8、9、10 人局中，第 4 轮任务需要至少 2 张失败票才算任务失败</strong></p>
    </div>

    <div className="flow-step">
      <h5>5️⃣ 刺杀梅林</h5>
      <p>当蓝方成功完成 <strong>3 次任务</strong> 后，进入刺杀阶段：</p>
      <ul>
        <li>红方玩家可进行讨论</li>
        <li>最终由 <strong>刺客</strong> 指定一名玩家进行刺杀</li>
      </ul>
      <p><strong>刺杀结果：</strong></p>
      <ul>
        <li>刺中 <strong>梅林</strong> → 红方获胜</li>
        <li>刺错 → 蓝方获胜</li>
      </ul>
    </div>
  </div>
);

const RoleInfo: React.FC = () => (
  <div className="help-section">
    <h3>🎭 角色与视野说明</h3>
    <p>在阿瓦隆中，不同角色拥有不同的"可见信息"，这是推理的核心。</p>

    <div className="role-card good">
      <h4>🧙‍♂️ 梅林（善良）</h4>
      <ul>
        <li><strong>能看到</strong>：除莫德雷德外的所有邪恶阵营成员</li>
        <li><strong>看不到</strong>：莫德雷德</li>
        <li>必须隐藏身份，避免被刺客发现</li>
      </ul>
    </div>

    <div className="role-card good">
      <h4>🛡️ 派西维尔（善良）</h4>
      <ul>
        <li><strong>能看到</strong>：梅林、莫甘娜（但无法区分谁是谁）</li>
        <li><strong>看不到</strong>：其他所有玩家</li>
        <li>需要通过行为判断真正的梅林</li>
      </ul>
    </div>

    <div className="role-card good">
      <h4>👤 忠臣（善良）</h4>
      <ul>
        <li><strong>能看到</strong>：只能看到自己</li>
        <li><strong>看不到</strong>：所有其他玩家</li>
        <li>无特殊能力，依靠逻辑与讨论取胜</li>
      </ul>
    </div>

    <div className="role-card evil">
      <h4>🧛‍♀️ 莫甘娜（邪恶）</h4>
      <ul>
        <li><strong>能看到</strong>：除奥伯伦外的所有邪恶阵营成员</li>
        <li><strong>看不到</strong>：奥伯伦</li>
        <li>会被派西维尔误认为梅林</li>
      </ul>
    </div>

    <div className="role-card evil">
      <h4>🗡️ 刺客（邪恶）</h4>
      <ul>
        <li><strong>能看到</strong>：除奥伯伦外的所有邪恶阵营成员</li>
        <li><strong>看不到</strong>：奥伯伦</li>
        <li>在刺杀阶段决定红方最终胜负</li>
      </ul>
    </div>

    <div className="role-card evil">
      <h4>🕶️ 莫德雷德（邪恶）</h4>
      <ul>
        <li><strong>能看到</strong>：除奥伯伦外的所有邪恶阵营成员</li>
        <li><strong>看不到</strong>：奥伯伦</li>
        <li><strong>不会被梅林看到</strong></li>
      </ul>
    </div>

    <div className="role-card evil">
      <h4>🐾 爪牙（邪恶）</h4>
      <ul>
        <li><strong>能看到</strong>：除奥伯伦外的所有邪恶阵营成员</li>
        <li><strong>看不到</strong>：奥伯伦</li>
        <li>无特殊能力，用于补充邪恶阵营人数</li>
      </ul>
    </div>

    <div className="role-card evil">
      <h4>👁️ 奥伯伦（邪恶）</h4>
      <ul>
        <li><strong>能看到</strong>：只能看到自己</li>
        <li><strong>看不到</strong>：所有其他邪恶成员</li>
        <li>是混乱与误导的来源</li>
      </ul>
    </div>

    <div className="role-card special">
      <h4>🧙 兰斯洛特（特殊角色，如启用）</h4>
      <ul>
        <li><strong>能看到</strong>：只能看到自己</li>
        <li><strong>看不到</strong>：所有其他玩家</li>
        <li>阵营可能发生变化（若规则启用）</li>
      </ul>
    </div>
  </div>
);

const FAQ: React.FC = () => (
  <div className="help-section">
    <h3>❓ 常见问题</h3>

    <div className="faq-item">
      <h4>Q: 如何查看我的角色信息？</h4>
      <p>A: 游戏开始后，您的角色和视野信息会显示在游戏界面的右侧"我的角色"面板中。面板会显示：</p>
      <ul>
        <li>您的角色名称和阵营</li>
        <li>您能看到的其他玩家信息（如果有的话）</li>
        <li>您的特殊能力说明</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q: 如何进行组队？</h4>
      <p>A: 当您是队长时：</p>
      <ol>
        <li>在玩家列表中点击玩家头像来选择或取消选择队员</li>
        <li>选择的队员数量必须符合当前任务要求（显示在任务面板中）</li>
        <li>选择讨论方向：顺时针或逆时针</li>
        <li>点击"提交队伍"按钮完成组队</li>
      </ol>
    </div>

    <div className="faq-item">
      <h4>Q: 如何对组队进行投票？</h4>
      <p>A: 当队长提交队伍后，所有玩家需要投票：</p>
      <ul>
        <li>点击"赞成"表示同意这个队伍执行任务</li>
        <li>点击"反对"表示不同意这个队伍</li>
        <li>投票结果会在所有人投票完成后公开显示</li>
        <li>超过半数赞成才能通过，否则进入下一轮组队</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q: 如何执行任务？</h4>
      <p>A: 如果您被选入任务队伍且组队投票通过：</p>
      <ul>
        <li><strong>善良阵营</strong>：只能选择"任务成功"</li>
        <li><strong>邪恶阵营</strong>：可以选择"任务成功"或"任务失败"</li>
        <li>您的选择是秘密的，其他人只能看到最终统计结果</li>
        <li>结果会显示成功和失败的票数，但不会显示谁投了什么</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q: 什么时候可以发言讨论？</h4>
      <p>A: 讨论主要发生在以下阶段：</p>
      <ul>
        <li><strong>组队后</strong>：队长提交队伍后，按指定方向轮流发言</li>
        <li><strong>任务结果公布后</strong>：所有玩家可以讨论任务结果</li>
        <li><strong>刺杀阶段</strong>：红方玩家可以讨论刺杀目标</li>
        <li>请在聊天框输入您的发言，其他玩家会实时看到</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q: 任务面板上的符号是什么意思？</h4>
      <p>A: 任务面板显示所有5轮任务的状态：</p>
      <ul>
        <li><strong>✓（绿色）</strong>：任务成功</li>
        <li><strong>✗（红色）</strong>：任务失败</li>
        <li><strong>圆圈</strong>：任务尚未开始</li>
        <li><strong>高亮圆圈</strong>：当前进行的任务</li>
        <li>面板还会显示每轮任务需要的队员数量</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q: 如何知道当前是什么阶段？</h4>
      <p>A: 游戏界面顶部会显示当前阶段和提示信息：</p>
      <ul>
        <li>"等待队长组队" - 队长正在选择队员</li>
        <li>"对组队进行投票" - 所有玩家投票决定是否同意队伍</li>
        <li>"执行任务" - 被选中的队员执行任务</li>
        <li>"刺杀梅林" - 刺客选择刺杀目标</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q: 可以中途退出游戏吗？</h4>
      <p>A: 可以，但请注意：</p>
      <ul>
        <li>游戏进行中退出会影响其他玩家的游戏体验</li>
        <li>如果意外断线，刷新页面后可以重新加入游戏</li>
        <li>您的角色和游戏状态会被保留</li>
        <li>建议在游戏结束后再离开房间</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q: 如何查看历史任务记录？</h4>
      <p>A: 在游戏界面右侧的"任务历史"面板中，您可以看到：</p>
      <ul>
        <li>每轮任务的队伍成员</li>
        <li>组队投票的结果（谁投了赞成/反对）</li>
        <li>任务执行结果（成功/失败票数）</li>
        <li>点击历史记录可以查看详细信息</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q: 我的角色应该怎么玩？</h4>
      <p>A: 这取决于您的角色，一些基本建议：</p>
      <ul>
        <li><strong>梅林</strong>：用您的信息引导善良阵营，但不要暴露自己</li>
        <li><strong>派西维尔</strong>：观察谁更像梅林，保护真正的梅林</li>
        <li><strong>忠臣</strong>：观察其他人的行为，找出值得信任的人</li>
        <li><strong>邪恶阵营</strong>：隐藏身份，适时破坏任务，找出梅林</li>
        <li>更多策略需要在游戏中慢慢体会！</li>
      </ul>
    </div>
  </div>
);
