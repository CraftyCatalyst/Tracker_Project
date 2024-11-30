import os
import pandas as pd
from graphviz import Digraph

#Test
# Create a Digraph object
dot = Digraph(comment='Dependency Tree')

# Load the data from the spreadsheet
file_name = 'Data2.xlsx'
file_path = os.path.join(os.getcwd(), file_name)
data_frame = pd.read_excel(file_path)

# Convert the data to a list of tuples
data = list(zip(data_frame['Level'], data_frame['Node']))

# Adding nodes to the graph
for level, name in data:
    dot.node(str(name), str(name))

# Adding edges to represent dependencies
for i in range(len(data) - 1):
    parent_level, parent_name = data[i]
    child_level, child_name = data[i + 1]
    if child_level == parent_level + 1:
        dot.edge(str(parent_name), str(child_name))

# Save and render the graph
output_file_name = 'dependency_tree'
output_file_path = os.path.join(os.getcwd(), output_file_name)
dot.render(output_file_path, view=True)
