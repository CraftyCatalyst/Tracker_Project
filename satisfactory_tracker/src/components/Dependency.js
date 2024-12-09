import React, { useState } from 'react';
import { buildDependencyTree } from '../services/dependencyTreeService';

function DependencyTree() {
    const [treeData, setTreeData] = useState(null);
    const [partId, setPartId] = useState(1);
    const [recipeType, setRecipeType] = useState('_Standard');
    const [targetQuantity, setTargetQuantity] = useState(100);
    const [error, setError] = useState('');
  
    const handleBuildTree = async () => {
      try {
        const data = await buildDependencyTree(partId, recipeType, targetQuantity);
        setTreeData(data);
        setError('');
      } catch (error) {
        setError('Failed to build the tree. Check the console for more details.');
      }
    };
  
    return (
      <div>
        <input type="number" value={partId} onChange={(e) => setPartId(e.target.value)} placeholder="Part ID" />
        <input type="text" value={recipeType} onChange={(e) => setRecipeType(e.target.value)} placeholder="Recipe Type" />
        <input type="number" value={targetQuantity} onChange={(e) => setTargetQuantity(e.target.value)} placeholder="Target Quantity" />
        <button onClick={handleBuildTree}>Build Dependency Tree</button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <pre>{treeData ? JSON.stringify(treeData, null, 2) : 'No data yet'}</pre>
      </div>
    );
  }

export default DependencyTree;
