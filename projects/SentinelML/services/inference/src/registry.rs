use crate::model::Model;
use serde_json::Value;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

pub struct Registry {
    root: PathBuf,
    pub default_version: String,
    models: HashMap<String, Model>,
}

impl Registry {
    pub fn new(default_directory: &Path) -> anyhow::Result<Self> {
        let directory = default_directory.canonicalize()?;
        let root = directory
            .parent()
            .ok_or_else(|| anyhow::anyhow!("model root missing"))?
            .to_path_buf();
        let model = Model::load(&directory)?;
        let version = model.metadata["model_version"].as_str().unwrap().to_owned();
        anyhow::ensure!(
            directory.file_name().and_then(|name| name.to_str()) == Some(version.as_str()),
            "bundle directory/version mismatch"
        );
        Ok(Self {
            root,
            default_version: version.clone(),
            models: HashMap::from([(version, model)]),
        })
    }

    pub fn load(&mut self, version: &str) -> anyhow::Result<&mut Model> {
        anyhow::ensure!(
            !version.is_empty()
                && version.len() <= 64
                && version != "."
                && version != ".."
                && version
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || b"._-".contains(&byte)),
            "invalid model version"
        );
        let directory = self.root.join(version).canonicalize()?;
        anyhow::ensure!(
            directory.parent() == Some(self.root.as_path()),
            "model path escaped artifact root"
        );
        if !self.models.contains_key(version) {
            let model = Model::load(&directory)?;
            anyhow::ensure!(
                model.metadata["model_version"] == version,
                "bundle version mismatch"
            );
            // Bound model sessions. An evicted immutable artifact is revalidated on next use.
            if self.models.len() >= 8 {
                if let Some(key) = self
                    .models
                    .keys()
                    .find(|key| *key != &self.default_version)
                    .cloned()
                {
                    self.models.remove(&key);
                }
            }
            self.models.insert(version.to_owned(), model);
        }
        Ok(self.models.get_mut(version).unwrap())
    }

    pub fn manifests(&mut self) -> anyhow::Result<Vec<Value>> {
        let mut versions: Vec<String> = std::fs::read_dir(&self.root)?
            .filter_map(Result::ok)
            .filter(|entry| entry.path().is_dir())
            .filter_map(|entry| entry.file_name().into_string().ok())
            .collect();
        versions.sort();
        anyhow::ensure!(versions.len() <= 64, "artifact registry exceeds 64 bundles");
        versions
            .iter()
            .map(|version| self.load(version).map(|model| model.metadata.clone()))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_artifact_path_traversal() {
        let mut registry =
            Registry::new(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../ml/artifacts/v1"))
                .unwrap();
        for version in ["..", "../v1", "/tmp", "v1/../../", ""] {
            assert!(registry.load(version).is_err());
        }
        assert!(registry.load("v1").is_ok());
    }
}
