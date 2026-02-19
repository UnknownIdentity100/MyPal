import streamlit as st
import subprocess
import os

st.set_page_config(page_title="Run MyPal School App", layout="wide")
st.title("MyPal School App Runner")

st.header("Run MyPal School App (JS)")
st.write(
    """
    This will run your MyPal app (`.cursor/MyPal.js`) using Node.js and display the output below.
    Make sure the file exists and Node.js is installed.
    """
)

if st.button("Run MyPal App"):
    mypal_path = os.path.join(".cursor", "MyPal.js")
    if not os.path.exists(mypal_path):
        st.error("Could not find '.cursor/MyPal.js'.")
    else:
        with st.spinner("Running MyPal.js..."):
            try:
                proc = subprocess.Popen(
                    ["node", mypal_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                output = ""
                out_box = st.empty()
                for line in iter(proc.stdout.readline, ""):
                    if not line:
                        break
                    output += line
                    out_box.code(output, language="javascript")
                proc.stdout.close()
                ret = proc.wait()
                if ret == 0:
                    st.success("MyPal App finished running.")
                else:
                    st.error(f"MyPal.js exited with error code {ret}")
                    err = proc.stderr.read()
                    if err:
                        st.error(err)
            except Exception as e:
                st.error(f"Error running MyPal.js: {e}")

st.info("Place '.cursor/MyPal.js' in the correct location. Ensure you have Node.js installed for this Streamlit runner.")
