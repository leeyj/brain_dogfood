import { Constants } from '../utils/Constants.js';

export const GraphAnalyzer = {
    analyze(memos, width, height) {
        const uniqueGroups = [...new Set(memos.map(m => m.group_name || Constants.GROUPS.DEFAULT))];
        const groupCenters = {};
        const radius = Math.min(width, height) * 0.35;
        
        uniqueGroups.forEach((g, i) => {
            const angle = (i / uniqueGroups.length) * Math.PI * 2;
            groupCenters[g] = {
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius
            };
        });

        const nodes = memos.map(m => ({
            ...m,
            id: m.id.toString(),
            group: m.group_name || Constants.GROUPS.DEFAULT,
            weight: (m.links ? m.links.length : 0) + 5
        }));

        const links = [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        
        memos.forEach(m => {
            if (m.links) {
                m.links.forEach(l => {
                    const targetId = (l.target_id || l.id).toString();
                    if (nodeMap.has(targetId)) {
                        links.push({ source: m.id.toString(), target: targetId, type: 'explicit' });
                    }
                });
            }
        });

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];
                
                const tagsA = new Set((nodeA.tags || []).map(t => t.name));
                const tagsB = new Set((nodeB.tags || []).map(t => t.name));
                
                const commonTags = [...tagsA].filter(t => tagsB.has(t));
                if (commonTags.length > 0) {
                    links.push({ 
                        source: nodeA.id, 
                        target: nodeB.id, 
                        type: 'tag', 
                        strength: commonTags.length 
                    });
                } else if (nodeA.group === nodeB.group) {
                    links.push({
                        source: nodeA.id,
                        target: nodeB.id,
                        type: 'group',
                        strength: 0.1
                    });
                }
            }
        }

        return { nodes, links, groupCenters, uniqueGroups };
    }
};
