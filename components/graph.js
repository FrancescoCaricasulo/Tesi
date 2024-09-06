import React, { useEffect } from 'react';
import { Network } from 'vis-network/standalone/umd/vis-network';

const Graph = ({ data }) => {
  useEffect(() => {
    const { word, sentences } = data;
    const nodes = [{ id: 1, label: word }];
    const edges = [];

    sentences.forEach((sentence, index) => {
      const nodeId = index + 2;
      nodes.push({ id: nodeId, label: sentence });
      edges.push({ from: 1, to: nodeId });
    });

    const container = document.getElementById('network');
    const networkData = {
      nodes: nodes,
      edges: edges
    };
    const options = {
      nodes: {
        shape: 'box'
      },
      edges: {
        arrows: {
          to: { enabled: true, scaleFactor: 1.2 }
        }
      }
    };

    new Network(container, networkData, options);
  }, [data]);

  return <div id="network" style={{ width: '100%', height: '100vh' }}></div>;
};

export default Graph;
