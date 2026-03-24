import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import axios from 'axios';

// Main App Component
export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <HomeScreen />
    </SafeAreaView>
  );
}

// HomeScreen Component
const HomeScreen = () => {
  const [pokemonList, setPokemonList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchPokemons();
  }, [offset]);

  const fetchPokemons = async () => {
    try {
      setError(null);
      const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
      setTotalCount(data.count);
      const results = await Promise.all(
        data.results.map(async (pokemon) => {
          try {
            const details = await axios.get(pokemon.url);
            return {
              id: details.data.id,
              name: pokemon.name,
              types: details.data.types.map(t => t.type.name),
              sprite: details.data.sprites.other['official-artwork'].front_default,
              height: details.data.height,
              weight: details.data.weight,
              abilities: details.data.abilities.map(a => a.ability.name),
            };
          } catch (error) {
            console.error(`Failed to fetch details for ${pokemon.name}:`, error);
            return null;
          }
        })
      );
      setPokemonList(results.filter(pokemon => pokemon !== null));
    } catch (error) {
      console.error(error);
      setError('Failed to load Pokémon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPokemon = pokemonList.filter(pokemon =>
    pokemon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePokemonPress = (pokemon) => {
    setSelectedPokemon(pokemon);
    setModalVisible(true);
  };

  const handleNext = () => setOffset(prev => prev + limit);

  const handlePrevious = () => {
    if (offset >= limit) setOffset(prev => prev - limit);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6f61" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pokédex</Text>
      <Text style={styles.description}>
        {searchQuery
          ? `Found ${filteredPokemon.length} matches`
          : `Showing ${offset + 1} to ${Math.min(offset + limit, totalCount)} of ${totalCount} Pokémon`}
      </Text>

      <TextInput
        style={styles.searchBar}
        placeholder="🔍 Search Pokémon..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={filteredPokemon}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PokemonCard pokemon={item} onPress={() => handlePokemonPress(item)} />
        )}
      />

      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.paginationButton, offset === 0 && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={offset === 0}
        >
          <Text style={styles.paginationButtonText}>← Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.paginationButton} onPress={handleNext}>
          <Text style={styles.paginationButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {selectedPokemon && (
              <>
                <Image source={{ uri: selectedPokemon.sprite }} style={styles.modalImage} />
                <Text style={styles.modalName}>
                  {selectedPokemon.name.charAt(0).toUpperCase() + selectedPokemon.name.slice(1)}
                </Text>
                <View style={styles.typeContainer}>
                  {selectedPokemon.types.map((type, index) => (
                    <View key={index} style={[styles.typeBadge, { backgroundColor: getTypeColor(type) }]}>
                      <Text style={styles.typeText}>{type}</Text>
                    </View>
                  ))}
                </View>
                <ScrollView style={styles.modalScrollView}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Generation:</Text>
                    <Text style={styles.detailValue}>{getGeneration(selectedPokemon.id)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Height:</Text>
                    <Text style={styles.detailValue}>{selectedPokemon.height / 10}m</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weight:</Text>
                    <Text style={styles.detailValue}>{selectedPokemon.weight / 10}kg</Text>
                  </View>
                  <Text style={styles.detailLabel}>Abilities:</Text>
                  {selectedPokemon.abilities.map((ability, index) => (
                    <Text key={index} style={styles.abilityText}>• {ability}</Text>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// PokemonCard Component
const PokemonCard = ({ pokemon, onPress }) => {
  const bgColor = getTypeColor(pokemon.types[0]);
  const textColor = getTextColor(bgColor);
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri: pokemon.sprite }} style={styles.image} />
      <Text style={[styles.name, { color: textColor }]}>
        {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
      </Text>
      <View style={styles.typeContainer}>
        {pokemon.types.map((type, index) => (
          <View key={index} style={[styles.typeBadge, { backgroundColor: getTypeColor(type) }]}>
            <Text style={styles.typeText}>{type}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.number, { color: textColor }]}>
        #{pokemon.id.toString().padStart(3, '0')}
      </Text>
    </TouchableOpacity>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0f7fa', // Light blue background
    padding: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6f61',
    textAlign: 'center',
    marginVertical: 10,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchBar: {
    height: 40,
    borderColor: '#ff6f61',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    margin: 10,
    backgroundColor: 'white',
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  list: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
  },
  card: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  image: {
    width: 100,
    height: 100,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  typeBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginHorizontal: 2,
  },
  typeText: {
    fontSize: 12,
    color: 'white',
  },
  number: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    maxHeight: '80%',
  },
  modalScrollView: {
    maxHeight: 200,
    width: '100%',
  },
  modalImage: {
    width: 150,
    height: 150,
  },
  modalName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#ff6f61',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 5,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  detailValue: {
    fontSize: 16,
    color: '#555',
  },
  abilityText: {
    fontSize: 16,
    marginVertical: 2,
    color: '#555',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ff6f61',
    borderRadius: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  paginationButton: {
    backgroundColor: '#ff6f61',
    padding: 10,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  paginationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

// Helper Functions
const getTypeColor = (type) => {
  const colors = {
    fire: '#ff6f61',
    grass: '#78c850',
    electric: '#f8d030',
    water: '#6890f0',
    ground: '#e0c068',
    rock: '#b8a038',
    fairy: '#ee99ac',
    poison: '#a040a0',
    bug: '#a8b820',
    dragon: '#7038f8',
    psychic: '#f85888',
    flying: '#a890f0',
    fighting: '#c03028',
    normal: '#a8a878',
    ghost: '#705898',
    ice: '#98d8d8',
    dark: '#705848',
    steel: '#b8b8d0',
  };
  return colors[type] || '#a8a878';
};

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const getLuminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

const getTextColor = (bgColor) => {
  const luminance = getLuminance(bgColor);
  return luminance > 150 ? '#333' : '#fff';
};

const getGeneration = (id) => {
  if (id <= 151) return 'I';
  if (id <= 251) return 'II';
  if (id <= 386) return 'III';
  if (id <= 493) return 'IV';
  if (id <= 649) return 'V';
  if (id <= 721) return 'VI';
  if (id <= 809) return 'VII';
  if (id <= 905) return 'VIII';
  return 'Unknown';
};