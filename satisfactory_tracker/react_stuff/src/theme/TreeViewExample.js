import React from 'react';
import { SimpleTreeView, SimpleTreeItem } from '@mui/x-tree-view';
import { ExpandMore, ChevronRight } from '@mui/icons-material';


const SampleTreeView = () => {
  return (
    <SimpleTreeView
      defaultCollapseIcon={<ExpandMore />}
      defaultExpandIcon={<ChevronRight />}
    >
      <SimpleTreeItem nodeId="1" label="Parent">
        <SimpleTreeItem nodeId="2" label="Child 1" />
        <SimpleTreeItem nodeId="3" label="Child 2">
          <SimpleTreeItem nodeId="4" label="Subchild" />
        </SimpleTreeItem>
      </SimpleTreeItem>
    </SimpleTreeView>
  );
};

export default SampleTreeView;