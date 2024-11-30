import os
import networkx as nx
import matplotlib.pyplot as plt
import pandas as pd

file_name = 'Data2.xlsx'
file_path = os.path.join(os.getcwd(), file_name)
data_frame = pd.read_excel(file_path)

# Convert the data to a list of tuples
data = list(zip(data_frame['Level'], data_frame['Node']))

# Create a directed graph using networkx
G = nx.DiGraph()

# Adding nodes and edges
for i in range(len(data) - 1):
    current_level, current_name = data[i]
    next_level, next_name = data[i + 1]
    G.add_node(current_name)  # Add the current node to the graph
    
    # Only add an edge if the next node is a child (next level)
    if next_level == current_level + 1:
    #if next_level == 0:
        G.add_edge(current_name, next_name)

# Drawing the graph using matplotlib
plt.figure(figsize=(10, 8))

# Layout
pos = nx.spring_layout(G, seed=42)

# Draw the nodes, edges, and labels
nx.draw_networkx_nodes(G, pos, node_color='skyblue', node_size=1000)
nx.draw_networkx_edges(G, pos, edgelist=G.edges(), edge_color='black')
nx.draw_networkx_labels(G, pos, font_size=8, font_color='black')

plt.title("Dependency Tree Flowchart")
plt.axis('off')
plt.show()
